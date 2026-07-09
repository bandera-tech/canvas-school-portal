import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { UserInput } from '../../shared/contracts.js';
import { hashPassword } from '../auth/password.js';
import type { Database } from '../database/types.js';
import { conflict, notFound } from '../errors.js';
import { AuthService } from './auth-service.js';

export class AdminService {
  private readonly auth: AuthService;

  constructor(private readonly db: Kysely<Database>) {
    this.auth = new AuthService(db);
  }

  listUsers() {
    return this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'role', 'status', 'createdAt'])
      .orderBy('name')
      .execute();
  }

  createUser(input: UserInput) {
    return this.auth.createManagedUser(input);
  }

  async updateUser(
    id: string,
    input: Partial<UserInput>
  ): Promise<Record<string, unknown>> {
    const { password, ...changes } = input;
    const update = password
      ? {
          ...changes,
          passwordHash: await hashPassword(password),
          updatedAt: new Date(),
        }
      : { ...changes, updatedAt: new Date() };
    const user = await this.db
      .updateTable('users')
      .set(update)
      .where('id', '=', id)
      .returning(['id', 'email', 'name', 'role', 'status'])
      .executeTakeFirst();
    if (!user) throw notFound('User not found.');
    return user;
  }

  async setStatus(id: string, status: 'active' | 'suspended') {
    const user = await this.db
      .updateTable('users')
      .set({ status, updatedAt: new Date() })
      .where('id', '=', id)
      .returning(['id', 'email', 'name', 'role', 'status'])
      .executeTakeFirst();
    if (!user) throw notFound('User not found.');
    return user;
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId)
      throw conflict('You cannot delete your own account.');
    const result = await this.db
      .deleteFrom('users')
      .where('id', '=', id)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0) throw notFound('User not found.');
  }

  listGroups() {
    return this.db
      .selectFrom('teacherGroups')
      .leftJoin(
        'teacherGroupMembers',
        'teacherGroupMembers.groupId',
        'teacherGroups.id'
      )
      .leftJoin('users', 'users.id', 'teacherGroupMembers.teacherId')
      .select([
        'teacherGroups.id',
        'teacherGroups.name',
        'teacherGroups.createdAt',
        'users.id as teacherId',
        'users.name as teacherName',
      ])
      .orderBy('teacherGroups.name')
      .execute();
  }

  async createGroup(name: string) {
    try {
      return await this.db
        .insertInto('teacherGroups')
        .values({ id: randomUUID(), name })
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw conflict('A teacher group with that name already exists.');
      }
      throw error;
    }
  }

  async updateGroup(id: string, name: string) {
    const group = await this.db
      .updateTable('teacherGroups')
      .set({ name })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!group) throw notFound('Teacher group not found.');
    return group;
  }

  async deleteGroup(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('teacherGroups')
      .where('id', '=', id)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0)
      throw notFound('Teacher group not found.');
  }

  async addTeacher(groupId: string, teacherId: string): Promise<void> {
    const teacher = await this.db
      .selectFrom('users')
      .select('id')
      .where('id', '=', teacherId)
      .where('role', '=', 'teacher')
      .executeTakeFirst();
    if (!teacher) throw notFound('Teacher not found.');
    await this.db
      .insertInto('teacherGroupMembers')
      .values({ groupId, teacherId })
      .onConflict((conflictBuilder) => conflictBuilder.doNothing())
      .execute();
  }

  async removeTeacher(groupId: string, teacherId: string): Promise<void> {
    const result = await this.db
      .deleteFrom('teacherGroupMembers')
      .where('groupId', '=', groupId)
      .where('teacherId', '=', teacherId)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0)
      throw notFound('Group membership not found.');
  }
}
