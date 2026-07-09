import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SessionUser, UserRole } from '../../shared/contracts.js';
import type { AuthService } from '../services/auth-service.js';
import { AppError } from '../errors.js';
import { readSessionToken } from './token.js';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

export function createGuards(auth: AuthService, secret: string) {
  async function requireAuth(request: FastifyRequest): Promise<void> {
    const token = request.cookies.session;
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
    try {
      const claims = readSessionToken(token, secret);
      request.sessionUser = await auth.findActiveUser(claims.sub);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, 'INVALID_SESSION', 'Please sign in again.');
    }
  }

  function requireRole(...roles: UserRole[]) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      await requireAuth(request);
      if (!request.sessionUser || !roles.includes(request.sessionUser.role)) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'You do not have access to this area.'
        );
      }
    };
  }

  return { requireAuth, requireRole };
}
