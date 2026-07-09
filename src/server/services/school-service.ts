import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type {
  AssignmentInput,
  ClassInput,
  GradeInput,
  LessonInput,
  SubmissionInput,
} from '../../shared/contracts.js';
import type { Database } from '../database/types.js';
import { conflict, forbidden, notFound } from '../errors.js';

export class SchoolService {
  constructor(private readonly db: Kysely<Database>) {}

  listTeacherClasses(teacherId: string) {
    return this.db
      .selectFrom('classes')
      .selectAll()
      .where('teacherId', '=', teacherId)
      .orderBy('name')
      .execute();
  }

  createClass(teacherId: string, input: ClassInput) {
    return this.db
      .insertInto('classes')
      .values({ id: randomUUID(), teacherId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateClass(teacherId: string, id: string, input: Partial<ClassInput>) {
    const item = await this.db
      .updateTable('classes')
      .set({ ...input, updatedAt: new Date() })
      .where('id', '=', id)
      .where('teacherId', '=', teacherId)
      .returningAll()
      .executeTakeFirst();
    if (!item) throw notFound('Class not found.');
    return item;
  }

  async deleteClass(teacherId: string, id: string): Promise<void> {
    const result = await this.db
      .deleteFrom('classes')
      .where('id', '=', id)
      .where('teacherId', '=', teacherId)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0) throw notFound('Class not found.');
  }

  async enrollStudent(teacherId: string, classId: string, studentId: string) {
    await this.assertTeacherOwnsClass(teacherId, classId);
    const student = await this.db
      .selectFrom('users')
      .select('id')
      .where('id', '=', studentId)
      .where('role', '=', 'student')
      .where('status', '=', 'active')
      .executeTakeFirst();
    if (!student) throw notFound('Active student not found.');
    await this.db
      .insertInto('classStudents')
      .values({ classId, studentId })
      .onConflict((builder) => builder.doNothing())
      .execute();
  }

  async removeStudent(teacherId: string, classId: string, studentId: string) {
    await this.assertTeacherOwnsClass(teacherId, classId);
    const result = await this.db
      .deleteFrom('classStudents')
      .where('classId', '=', classId)
      .where('studentId', '=', studentId)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) === 0)
      throw notFound('Enrollment not found.');
  }

  async createLesson(teacherId: string, classId: string, input: LessonInput) {
    await this.assertTeacherOwnsClass(teacherId, classId);
    return this.db
      .insertInto('lessons')
      .values({ id: randomUUID(), classId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async createAssignment(
    teacherId: string,
    classId: string,
    input: AssignmentInput
  ) {
    await this.assertTeacherOwnsClass(teacherId, classId);
    return this.db
      .insertInto('assignments')
      .values({
        id: randomUUID(),
        classId,
        ...input,
        dueAt: new Date(input.dueAt),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  listTeacherSubmissions(teacherId: string) {
    return this.db
      .selectFrom('submissions')
      .innerJoin('assignments', 'assignments.id', 'submissions.assignmentId')
      .innerJoin('classes', 'classes.id', 'assignments.classId')
      .innerJoin('users', 'users.id', 'submissions.studentId')
      .select([
        'submissions.id',
        'submissions.content',
        'submissions.linkUrl',
        'submissions.grade',
        'submissions.feedback',
        'submissions.submittedAt',
        'assignments.title as assignmentTitle',
        'classes.name as className',
        'users.name as studentName',
      ])
      .where('classes.teacherId', '=', teacherId)
      .orderBy('submissions.submittedAt', 'desc')
      .execute();
  }

  async gradeSubmission(
    teacherId: string,
    submissionId: string,
    input: GradeInput
  ) {
    const owned = await this.db
      .selectFrom('submissions')
      .innerJoin('assignments', 'assignments.id', 'submissions.assignmentId')
      .innerJoin('classes', 'classes.id', 'assignments.classId')
      .select('submissions.id')
      .where('submissions.id', '=', submissionId)
      .where('classes.teacherId', '=', teacherId)
      .executeTakeFirst();
    if (!owned) throw notFound('Submission not found.');
    return this.db
      .updateTable('submissions')
      .set({ ...input, gradedAt: new Date() })
      .where('id', '=', submissionId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  listStudentClasses(studentId: string) {
    return this.db
      .selectFrom('classStudents')
      .innerJoin('classes', 'classes.id', 'classStudents.classId')
      .innerJoin('users', 'users.id', 'classes.teacherId')
      .select([
        'classes.id',
        'classes.name',
        'classes.description',
        'users.name as teacherName',
      ])
      .where('classStudents.studentId', '=', studentId)
      .orderBy('classes.name')
      .execute();
  }

  listStudentWork(studentId: string) {
    return this.db
      .selectFrom('classStudents')
      .innerJoin('classes', 'classes.id', 'classStudents.classId')
      .leftJoin('lessons', (join) =>
        join
          .onRef('lessons.classId', '=', 'classes.id')
          .on('lessons.published', '=', true)
      )
      .leftJoin('assignments', (join) =>
        join
          .onRef('assignments.classId', '=', 'classes.id')
          .on('assignments.published', '=', true)
      )
      .leftJoin('submissions', (join) =>
        join
          .onRef('submissions.assignmentId', '=', 'assignments.id')
          .on('submissions.studentId', '=', studentId)
      )
      .select([
        'classes.id as classId',
        'classes.name as className',
        'lessons.id as lessonId',
        'lessons.title as lessonTitle',
        'lessons.content as lessonContent',
        'assignments.id as assignmentId',
        'assignments.title as assignmentTitle',
        'assignments.description as assignmentDescription',
        'assignments.dueAt',
        'submissions.id as submissionId',
        'submissions.grade',
        'submissions.feedback',
      ])
      .where('classStudents.studentId', '=', studentId)
      .orderBy('classes.name')
      .execute();
  }

  async submitWork(
    studentId: string,
    assignmentId: string,
    input: SubmissionInput
  ) {
    const assignment = await this.db
      .selectFrom('assignments')
      .innerJoin(
        'classStudents',
        'classStudents.classId',
        'assignments.classId'
      )
      .select('assignments.id')
      .where('assignments.id', '=', assignmentId)
      .where('assignments.published', '=', true)
      .where('classStudents.studentId', '=', studentId)
      .executeTakeFirst();
    if (!assignment)
      throw forbidden('You are not enrolled in this assignment.');
    const existing = await this.db
      .selectFrom('submissions')
      .select('grade')
      .where('assignmentId', '=', assignmentId)
      .where('studentId', '=', studentId)
      .executeTakeFirst();
    if (existing?.grade !== null && existing?.grade !== undefined) {
      throw conflict('A graded submission cannot be replaced.');
    }
    return this.db
      .insertInto('submissions')
      .values({ id: randomUUID(), assignmentId, studentId, ...input })
      .onConflict((builder) =>
        builder.columns(['assignmentId', 'studentId']).doUpdateSet({
          ...input,
          submittedAt: new Date(),
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  private async assertTeacherOwnsClass(teacherId: string, classId: string) {
    const item = await this.db
      .selectFrom('classes')
      .select('id')
      .where('id', '=', classId)
      .where('teacherId', '=', teacherId)
      .executeTakeFirst();
    if (!item) throw notFound('Class not found.');
  }
}
