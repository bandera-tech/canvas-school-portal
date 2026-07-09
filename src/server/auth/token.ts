import { sign, verify } from 'jsonwebtoken';
import { z } from 'zod';

const claimsSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['admin', 'teacher', 'student']),
});

const tokenOptions = {
  issuer: 'canvas-school-portal',
  audience: 'canvas-school-portal-web',
};

export function createSessionToken(
  userId: string,
  role: 'admin' | 'teacher' | 'student',
  secret: string
): string {
  return sign({ sub: userId, role }, secret, {
    ...tokenOptions,
    expiresIn: '8h',
  });
}

export function readSessionToken(token: string, secret: string) {
  return claimsSchema.parse(verify(token, secret, tokenOptions));
}
