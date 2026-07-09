import type { Redis } from 'ioredis';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database/types.js';
import { notFound } from '../errors.js';

export class StatsService {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly redis: Redis
  ) {}

  invalidate(): Promise<number> {
    return this.redis.incr('stats:version');
  }

  averageGrades() {
    return this.cached('average-grades', async () => {
      const row = await this.db
        .selectFrom('submissions')
        .select(sql<number>`coalesce(avg("grade"), 0)`.as('averageGrade'))
        .where('grade', 'is not', null)
        .executeTakeFirstOrThrow();
      return { averageGrade: Number(row.averageGrade) };
    });
  }

  averageGradeForClass(classId: string) {
    return this.cached(`average-grades:${classId}`, async () => {
      const item = await this.db
        .selectFrom('classes')
        .leftJoin('assignments', 'assignments.classId', 'classes.id')
        .leftJoin('submissions', 'submissions.assignmentId', 'assignments.id')
        .select([
          'classes.id',
          'classes.name',
          sql<number>`coalesce(avg("submissions"."grade"), 0)`.as(
            'averageGrade'
          ),
        ])
        .where('classes.id', '=', classId)
        .groupBy(['classes.id', 'classes.name'])
        .executeTakeFirst();
      if (!item) throw notFound('Class not found.');
      return { ...item, averageGrade: Number(item.averageGrade) };
    });
  }

  teacherNames() {
    return this.cached('teacher-names', () =>
      this.db
        .selectFrom('users')
        .select(['id', 'name'])
        .where('role', '=', 'teacher')
        .where('status', '=', 'active')
        .orderBy('name')
        .execute()
    );
  }

  studentNames() {
    return this.cached('student-names', () =>
      this.db
        .selectFrom('users')
        .select(['id', 'name'])
        .where('role', '=', 'student')
        .where('status', '=', 'active')
        .orderBy('name')
        .execute()
    );
  }

  classes() {
    return this.cached('classes', () =>
      this.db
        .selectFrom('classes')
        .innerJoin('users', 'users.id', 'classes.teacherId')
        .select([
          'classes.id',
          'classes.name',
          'classes.description',
          'users.name as teacherName',
        ])
        .orderBy('classes.name')
        .execute()
    );
  }

  studentsForClass(classId: string) {
    return this.cached(`classes:${classId}`, async () => {
      const item = await this.db
        .selectFrom('classes')
        .select(['id', 'name'])
        .where('id', '=', classId)
        .executeTakeFirst();
      if (!item) throw notFound('Class not found.');
      const students = await this.db
        .selectFrom('classStudents')
        .innerJoin('users', 'users.id', 'classStudents.studentId')
        .select(['users.id', 'users.name', 'users.email'])
        .where('classStudents.classId', '=', classId)
        .orderBy('users.name')
        .execute();
      return { ...item, students };
    });
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const version = (await this.redis.get('stats:version')) ?? '0';
    const cacheKey = `stats:${version}:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as T;
    const value = await load();
    await this.redis.set(cacheKey, JSON.stringify(value), 'EX', 60);
    return value;
  }
}
