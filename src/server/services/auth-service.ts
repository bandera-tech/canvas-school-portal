import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { SessionUser, UserRole } from '../../shared/contracts.js';
import type { Database } from '../database/types.js';
import { AppError, conflict } from '../errors.js';
import { hashPassword, verifyPassword } from '../auth/password.js';

const publicUserColumns = ['id', 'email', 'name', 'role', 'status'] as const;

export class AuthService {
  constructor(private readonly db: Kysely<Database>) {}

  async authenticate(email: string, password: string): Promise<SessionUser> {
    const user = await this.db
      .selectFrom('users')
      .select([...publicUserColumns, 'passwordHash'])
      .where('email', '=', email)
      .executeTakeFirst();
    if (
      !user?.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.'
      );
    }
    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'This account has been suspended.'
      );
    }
    const { passwordHash: _, ...sessionUser } = user;
    return sessionUser;
  }

  async findActiveUser(id: string): Promise<SessionUser> {
    const user = await this.db
      .selectFrom('users')
      .select(publicUserColumns)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!user)
      throw new AppError(401, 'INVALID_SESSION', 'Please sign in again.');
    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'This account has been suspended.'
      );
    }
    return user;
  }

  async findOrCreateOAuthStudent(input: {
    providerId: string;
    email: string;
    name: string;
  }): Promise<SessionUser> {
    const linked = await this.db
      .selectFrom('oauthAccounts')
      .innerJoin('users', 'users.id', 'oauthAccounts.userId')
      .select(publicUserColumns.map((column) => `users.${column}` as const))
      .where('oauthAccounts.provider', '=', 'github')
      .where('oauthAccounts.providerAccountId', '=', input.providerId)
      .executeTakeFirst();
    if (linked) return linked;

    return this.db.transaction().execute(async (trx) => {
      let user = await trx
        .selectFrom('users')
        .select(publicUserColumns)
        .where('email', '=', input.email)
        .executeTakeFirst();
      if (user && user.role !== 'student') {
        throw conflict('That email belongs to a managed staff account.');
      }
      if (!user) {
        user = await trx
          .insertInto('users')
          .values({
            id: randomUUID(),
            email: input.email,
            name: input.name,
            role: 'student',
            status: 'active',
            passwordHash: null,
          })
          .returning(publicUserColumns)
          .executeTakeFirstOrThrow();
      }
      await trx
        .insertInto('oauthAccounts')
        .values({
          id: randomUUID(),
          userId: user.id,
          provider: 'github',
          providerAccountId: input.providerId,
        })
        .execute();
      return user;
    });
  }

  async createManagedUser(input: {
    name: string;
    email: string;
    role: UserRole;
    password: string;
  }): Promise<SessionUser> {
    try {
      return await this.db
        .insertInto('users')
        .values({
          id: randomUUID(),
          name: input.name,
          email: input.email,
          role: input.role,
          status: 'active',
          passwordHash: await hashPassword(input.password),
        })
        .returning(publicUserColumns)
        .executeTakeFirstOrThrow();
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('A user with that email already exists.');
      throw error;
    }
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
