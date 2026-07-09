import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface UserTable {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'suspended';
  passwordHash: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TeacherGroupTable {
  id: string;
  name: string;
  createdAt: Timestamp;
}

interface TeacherGroupMemberTable {
  groupId: string;
  teacherId: string;
}

interface ClassTable {
  id: string;
  teacherId: string;
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ClassStudentTable {
  classId: string;
  studentId: string;
  enrolledAt: Timestamp;
}

interface LessonTable {
  id: string;
  classId: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface AssignmentTable {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: Timestamp;
  published: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SubmissionTable {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  linkUrl: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Timestamp;
  gradedAt: Timestamp | null;
}

interface OAuthAccountTable {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
}

export interface Database {
  users: UserTable;
  teacherGroups: TeacherGroupTable;
  teacherGroupMembers: TeacherGroupMemberTable;
  classes: ClassTable;
  classStudents: ClassStudentTable;
  lessons: LessonTable;
  assignments: AssignmentTable;
  submissions: SubmissionTable;
  oauthAccounts: OAuthAccountTable;
}
