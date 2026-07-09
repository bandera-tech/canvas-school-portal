import type { Kysely } from 'kysely';
import type { AppConfig } from '../config.js';
import { hashPassword } from '../auth/password.js';
import type { Database } from './types.js';

export const demoIds = {
  admin: '10000000-0000-4000-8000-000000000001',
  teacher: '10000000-0000-4000-8000-000000000002',
  student: '10000000-0000-4000-8000-000000000003',
  group: '20000000-0000-4000-8000-000000000001',
  class: '30000000-0000-4000-8000-000000000001',
  lesson: '40000000-0000-4000-8000-000000000001',
  assignment: '50000000-0000-4000-8000-000000000001',
  submission: '60000000-0000-4000-8000-000000000001',
} as const;

export async function seedDatabase(
  db: Kysely<Database>,
  config: AppConfig
): Promise<void> {
  const users = [
    {
      id: demoIds.admin,
      email: 'admin@canvas.test',
      name: 'Avery Admin',
      role: 'admin' as const,
      passwordHash: await hashPassword(config.DEMO_ADMIN_PASSWORD),
    },
    {
      id: demoIds.teacher,
      email: 'teacher@canvas.test',
      name: 'Taylor Teacher',
      role: 'teacher' as const,
      passwordHash: await hashPassword(config.DEMO_TEACHER_PASSWORD),
    },
    {
      id: demoIds.student,
      email: 'student@canvas.test',
      name: 'Sam Student',
      role: 'student' as const,
      passwordHash: await hashPassword(config.DEMO_STUDENT_PASSWORD),
    },
  ];
  for (const user of users) {
    await db
      .insertInto('users')
      .values({ ...user, status: 'active' })
      .onConflict((conflict) => conflict.column('id').doNothing())
      .execute();
  }
  await db
    .insertInto('teacherGroups')
    .values({ id: demoIds.group, name: 'Humanities' })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await db
    .insertInto('teacherGroupMembers')
    .values({ groupId: demoIds.group, teacherId: demoIds.teacher })
    .onConflict((conflict) => conflict.doNothing())
    .execute();
  await db
    .insertInto('classes')
    .values({
      id: demoIds.class,
      teacherId: demoIds.teacher,
      name: 'Modern World History',
      description:
        'A discussion-led survey of the events that shaped our world.',
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await db
    .insertInto('classStudents')
    .values({ classId: demoIds.class, studentId: demoIds.student })
    .onConflict((conflict) => conflict.doNothing())
    .execute();
  await db
    .insertInto('lessons')
    .values({
      id: demoIds.lesson,
      classId: demoIds.class,
      title: 'Reading Primary Sources',
      content: 'Compare the author, intended audience, context, and purpose.',
      published: true,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await db
    .insertInto('assignments')
    .values({
      id: demoIds.assignment,
      classId: demoIds.class,
      title: 'Source Analysis',
      description: 'Analyze one primary source using the four-part framework.',
      dueAt: new Date('2027-05-30T23:59:00.000Z'),
      published: true,
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
  await db
    .insertInto('submissions')
    .values({
      id: demoIds.submission,
      assignmentId: demoIds.assignment,
      studentId: demoIds.student,
      content:
        'The source was written for a public audience during a period of change.',
      linkUrl: '',
      grade: 92,
      feedback: 'Clear context and a well-supported conclusion.',
      gradedAt: new Date(),
    })
    .onConflict((conflict) => conflict.column('id').doNothing())
    .execute();
}
