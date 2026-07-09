import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import {
  assignmentInputSchema,
  classInputSchema,
  gradeInputSchema,
  idParamsSchema,
  lessonInputSchema,
  loginSchema,
  memberInputSchema,
  namedEntitySchema,
  statusSchema,
  submissionInputSchema,
  userInputSchema,
  userUpdateSchema,
} from '../shared/contracts.js';
import { createGuards } from './auth/guards.js';
import { createSessionToken } from './auth/token.js';
import type { AppConfig } from './config.js';
import type { Database } from './database/types.js';
import { AppError } from './errors.js';
import { AdminService } from './services/admin-service.js';
import { AuthService } from './services/auth-service.js';
import { SchoolService } from './services/school-service.js';
import { StatsService } from './services/stats-service.js';

const oauthQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
});
const githubEmailsSchema = z.array(
  z.object({
    email: z.string().email(),
    primary: z.boolean(),
    verified: z.boolean(),
  })
);

export function registerRoutes(
  app: FastifyInstance,
  dependencies: { db: Kysely<Database>; redis: Redis; config: AppConfig }
): void {
  const { db, redis, config } = dependencies;
  const auth = new AuthService(db);
  const admin = new AdminService(db);
  const school = new SchoolService(db);
  const stats = new StatsService(db, redis);
  const guards = createGuards(auth, config.JWT_SECRET);

  const setSession = (
    reply: FastifyReply,
    id: string,
    role: 'admin' | 'teacher' | 'student'
  ) => {
    reply.setCookie(
      'session',
      createSessionToken(id, role, config.JWT_SECRET),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
      }
    );
  };

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/ready', async () => {
    await db.selectFrom('users').select('id').limit(1).execute();
    await redis.ping();
    return { status: 'ready' };
  });

  app.post('/api/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await auth.authenticate(input.email, input.password);
    setSession(reply, user.id, user.role);
    return { user };
  });
  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie('session', { path: '/' });
    return reply.code(204).send();
  });
  app.get(
    '/api/auth/me',
    { preHandler: guards.requireAuth },
    async (request) => ({
      user: request.sessionUser,
    })
  );

  app.get('/api/auth/github', async (_request, reply) => {
    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      throw new AppError(
        503,
        'OAUTH_NOT_CONFIGURED',
        'GitHub sign-in is not configured.'
      );
    }
    const state = randomBytes(24).toString('hex');
    await redis.set(`oauth:${state}`, '1', 'EX', 600);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.GITHUB_CLIENT_ID);
    url.searchParams.set(
      'redirect_uri',
      `${config.APP_URL}/api/auth/github/callback`
    );
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    return reply.redirect(url.toString());
  });
  app.get('/api/auth/github/callback', async (request, reply) => {
    const { code, state } = oauthQuerySchema.parse(request.query);
    const validState = await redis.getdel(`oauth:${state}`);
    if (!validState)
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'OAuth request expired.');
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );
    const tokenData = z
      .object({ access_token: z.string() })
      .parse(await tokenResponse.json());
    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    };
    const [profileResponse, emailResponse] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/emails', { headers }),
    ]);
    const profile = githubUserSchema.parse(await profileResponse.json());
    const emails = githubEmailsSchema.parse(await emailResponse.json());
    const email = emails.find((item) => item.primary && item.verified)?.email;
    if (!email)
      throw new AppError(
        400,
        'EMAIL_REQUIRED',
        'GitHub did not return a verified email.'
      );
    const user = await auth.findOrCreateOAuthStudent({
      providerId: String(profile.id),
      email: email.toLowerCase(),
      name: profile.name ?? profile.login,
    });
    setSession(reply, user.id, user.role);
    return reply.redirect('/dashboard');
  });

  app.register(
    async (adminRoutes) => {
      adminRoutes.addHook('preHandler', guards.requireRole('admin'));
      adminRoutes.get('/users', () => admin.listUsers());
      adminRoutes.post('/users', async (request, reply) =>
        reply
          .code(201)
          .send(await admin.createUser(userInputSchema.parse(request.body)))
      );
      adminRoutes.patch('/users/:id', async (request) =>
        admin.updateUser(
          idParamsSchema.parse(request.params).id,
          userUpdateSchema.parse(request.body)
        )
      );
      adminRoutes.patch('/users/:id/status', async (request) =>
        admin.setStatus(
          idParamsSchema.parse(request.params).id,
          statusSchema.parse(request.body).status
        )
      );
      adminRoutes.delete('/users/:id', async (request, reply) => {
        await admin.deleteUser(
          idParamsSchema.parse(request.params).id,
          request.sessionUser!.id
        );
        return reply.code(204).send();
      });
      adminRoutes.get('/teacher-groups', () => admin.listGroups());
      adminRoutes.post('/teacher-groups', async (request, reply) =>
        reply
          .code(201)
          .send(
            await admin.createGroup(namedEntitySchema.parse(request.body).name)
          )
      );
      adminRoutes.patch('/teacher-groups/:id', async (request) =>
        admin.updateGroup(
          idParamsSchema.parse(request.params).id,
          namedEntitySchema.parse(request.body).name
        )
      );
      adminRoutes.delete('/teacher-groups/:id', async (request, reply) => {
        await admin.deleteGroup(idParamsSchema.parse(request.params).id);
        return reply.code(204).send();
      });
      adminRoutes.post(
        '/teacher-groups/:id/members',
        async (request, reply) => {
          await admin.addTeacher(
            idParamsSchema.parse(request.params).id,
            memberInputSchema.parse(request.body).userId
          );
          return reply.code(204).send();
        }
      );
      adminRoutes.delete(
        '/teacher-groups/:id/members/:userId',
        async (request, reply) => {
          const params = z
            .object({ id: z.string().uuid(), userId: z.string().uuid() })
            .parse(request.params);
          await admin.removeTeacher(params.id, params.userId);
          return reply.code(204).send();
        }
      );
    },
    { prefix: '/api/admin' }
  );

  app.register(
    async (teacherRoutes) => {
      teacherRoutes.addHook('preHandler', guards.requireRole('teacher'));
      teacherRoutes.get('/classes', (request) =>
        school.listTeacherClasses(request.sessionUser!.id)
      );
      teacherRoutes.post('/classes', async (request, reply) => {
        const item = await school.createClass(
          request.sessionUser!.id,
          classInputSchema.parse(request.body)
        );
        await stats.invalidate();
        return reply.code(201).send(item);
      });
      teacherRoutes.patch('/classes/:id', async (request) => {
        const item = await school.updateClass(
          request.sessionUser!.id,
          idParamsSchema.parse(request.params).id,
          classInputSchema.partial().parse(request.body)
        );
        await stats.invalidate();
        return item;
      });
      teacherRoutes.delete('/classes/:id', async (request, reply) => {
        await school.deleteClass(
          request.sessionUser!.id,
          idParamsSchema.parse(request.params).id
        );
        await stats.invalidate();
        return reply.code(204).send();
      });
      teacherRoutes.post('/classes/:id/students', async (request, reply) => {
        await school.enrollStudent(
          request.sessionUser!.id,
          idParamsSchema.parse(request.params).id,
          memberInputSchema.parse(request.body).userId
        );
        await stats.invalidate();
        return reply.code(204).send();
      });
      teacherRoutes.delete(
        '/classes/:id/students/:userId',
        async (request, reply) => {
          const params = z
            .object({ id: z.string().uuid(), userId: z.string().uuid() })
            .parse(request.params);
          await school.removeStudent(
            request.sessionUser!.id,
            params.id,
            params.userId
          );
          await stats.invalidate();
          return reply.code(204).send();
        }
      );
      teacherRoutes.post('/classes/:id/lessons', async (request, reply) =>
        reply
          .code(201)
          .send(
            await school.createLesson(
              request.sessionUser!.id,
              idParamsSchema.parse(request.params).id,
              lessonInputSchema.parse(request.body)
            )
          )
      );
      teacherRoutes.post('/classes/:id/assignments', async (request, reply) =>
        reply
          .code(201)
          .send(
            await school.createAssignment(
              request.sessionUser!.id,
              idParamsSchema.parse(request.params).id,
              assignmentInputSchema.parse(request.body)
            )
          )
      );
      teacherRoutes.get('/submissions', (request) =>
        school.listTeacherSubmissions(request.sessionUser!.id)
      );
      teacherRoutes.patch('/submissions/:id/grade', async (request) => {
        const result = await school.gradeSubmission(
          request.sessionUser!.id,
          idParamsSchema.parse(request.params).id,
          gradeInputSchema.parse(request.body)
        );
        await stats.invalidate();
        return result;
      });
    },
    { prefix: '/api/teacher' }
  );

  app.register(
    async (studentRoutes) => {
      studentRoutes.addHook('preHandler', guards.requireRole('student'));
      studentRoutes.get('/classes', (request) =>
        school.listStudentClasses(request.sessionUser!.id)
      );
      studentRoutes.get('/work', (request) =>
        school.listStudentWork(request.sessionUser!.id)
      );
      studentRoutes.put('/assignments/:id/submission', async (request) =>
        school.submitWork(
          request.sessionUser!.id,
          idParamsSchema.parse(request.params).id,
          submissionInputSchema.parse(request.body)
        )
      );
    },
    { prefix: '/api/student' }
  );

  app.register(
    async (statsRoutes) => {
      statsRoutes.addHook('preHandler', guards.requireAuth);
      statsRoutes.get('/average-grades', () => stats.averageGrades());
      statsRoutes.get('/average-grades/:id', (request) =>
        stats.averageGradeForClass(idParamsSchema.parse(request.params).id)
      );
      statsRoutes.get('/teacher-names', () => stats.teacherNames());
      statsRoutes.get('/student-names', () => stats.studentNames());
      statsRoutes.get('/classes', () => stats.classes());
      statsRoutes.get('/classes/:id', (request) =>
        stats.studentsForClass(idParamsSchema.parse(request.params).id)
      );
    },
    { prefix: '/api/v0/stats' }
  );
}
