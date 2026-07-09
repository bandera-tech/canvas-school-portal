import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('email', 'varchar(255)', (column) => column.notNull().unique())
    .addColumn('name', 'varchar(100)', (column) => column.notNull())
    .addColumn('role', 'varchar(20)', (column) => column.notNull())
    .addColumn('status', 'varchar(20)', (column) =>
      column.notNull().defaultTo('active')
    )
    .addColumn('passwordHash', 'text')
    .addColumn('createdAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('updatedAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createTable('teacherGroups')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('name', 'varchar(100)', (column) => column.notNull().unique())
    .addColumn('createdAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createTable('teacherGroupMembers')
    .addColumn('groupId', 'uuid', (column) =>
      column.references('teacherGroups.id').onDelete('cascade').notNull()
    )
    .addColumn('teacherId', 'uuid', (column) =>
      column.references('users.id').onDelete('cascade').notNull()
    )
    .addPrimaryKeyConstraint('teacher_group_members_pk', [
      'groupId',
      'teacherId',
    ])
    .execute();

  await db.schema
    .createTable('classes')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('teacherId', 'uuid', (column) =>
      column.references('users.id').onDelete('restrict').notNull()
    )
    .addColumn('name', 'varchar(100)', (column) => column.notNull())
    .addColumn('description', 'text', (column) =>
      column.notNull().defaultTo('')
    )
    .addColumn('createdAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('updatedAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createTable('classStudents')
    .addColumn('classId', 'uuid', (column) =>
      column.references('classes.id').onDelete('cascade').notNull()
    )
    .addColumn('studentId', 'uuid', (column) =>
      column.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('enrolledAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addPrimaryKeyConstraint('class_students_pk', ['classId', 'studentId'])
    .execute();

  await db.schema
    .createTable('lessons')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('classId', 'uuid', (column) =>
      column.references('classes.id').onDelete('cascade').notNull()
    )
    .addColumn('title', 'varchar(140)', (column) => column.notNull())
    .addColumn('content', 'text', (column) => column.notNull())
    .addColumn('published', 'boolean', (column) =>
      column.notNull().defaultTo(false)
    )
    .addColumn('createdAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('updatedAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createTable('assignments')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('classId', 'uuid', (column) =>
      column.references('classes.id').onDelete('cascade').notNull()
    )
    .addColumn('title', 'varchar(140)', (column) => column.notNull())
    .addColumn('description', 'text', (column) => column.notNull())
    .addColumn('dueAt', 'timestamptz', (column) => column.notNull())
    .addColumn('published', 'boolean', (column) =>
      column.notNull().defaultTo(false)
    )
    .addColumn('createdAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('updatedAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .execute();

  await db.schema
    .createTable('submissions')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('assignmentId', 'uuid', (column) =>
      column.references('assignments.id').onDelete('cascade').notNull()
    )
    .addColumn('studentId', 'uuid', (column) =>
      column.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('content', 'text', (column) => column.notNull().defaultTo(''))
    .addColumn('linkUrl', 'text', (column) => column.notNull().defaultTo(''))
    .addColumn('grade', 'numeric')
    .addColumn('feedback', 'text')
    .addColumn('submittedAt', 'timestamptz', (column) =>
      column.notNull().defaultTo(db.fn('now'))
    )
    .addColumn('gradedAt', 'timestamptz')
    .addUniqueConstraint('submission_student_assignment_unique', [
      'assignmentId',
      'studentId',
    ])
    .execute();

  await db.schema
    .createTable('oauthAccounts')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('userId', 'uuid', (column) =>
      column.references('users.id').onDelete('cascade').notNull()
    )
    .addColumn('provider', 'varchar(30)', (column) => column.notNull())
    .addColumn('providerAccountId', 'varchar(255)', (column) =>
      column.notNull()
    )
    .addUniqueConstraint('oauth_provider_account_unique', [
      'provider',
      'providerAccountId',
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of [
    'oauthAccounts',
    'submissions',
    'assignments',
    'lessons',
    'classStudents',
    'classes',
    'teacherGroupMembers',
    'teacherGroups',
    'users',
  ]) {
    await db.schema.dropTable(table).execute();
  }
}
