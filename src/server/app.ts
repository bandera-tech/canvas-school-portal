import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { Kysely } from 'kysely';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import type { Database } from './database/types.js';
import { AppError } from './errors.js';
import { registerRoutes } from './routes.js';

export async function buildApi(dependencies: {
  db: Kysely<Database>;
  redis: Redis;
  config: AppConfig;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: dependencies.config.NODE_ENV !== 'test' });
  app.decorateRequest('sessionUser', null);
  await app.register(cookie);
  await app.register(cors, {
    origin: dependencies.config.APP_URL,
    credentials: true,
  });

  app.addHook('onRequest', async (request) => {
    if (
      dependencies.config.NODE_ENV === 'production' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ) {
      const origin = request.headers.origin;
      if (origin && origin !== dependencies.config.APP_URL) {
        throw new AppError(
          403,
          'INVALID_ORIGIN',
          'Request origin is not allowed.'
        );
      }
    }
  });

  registerRoutes(app, dependencies);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const details = error.flatten().fieldErrors;
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Please check the submitted values.',
        details,
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    app.log.error(error);
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    });
  });
  return app;
}
