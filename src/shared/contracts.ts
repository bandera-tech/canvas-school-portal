import { z } from 'zod';

export const userRoles = ['admin', 'teacher', 'student'] as const;
export const userStatuses = ['active', 'suspended'] as const;

export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
export const userInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  role: z.enum(userRoles),
  password: z.string().min(8).max(128),
});
export const userUpdateSchema = userInputSchema
  .omit({ password: true })
  .partial()
  .extend({ password: z.string().min(8).max(128).optional() });
export const statusSchema = z.object({ status: z.enum(userStatuses) });
export const namedEntitySchema = z.object({
  name: z.string().trim().min(2).max(100),
});
export const classInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
});
export const lessonInputSchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(1).max(20_000),
  published: z.boolean().default(false),
});
export const assignmentInputSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(1).max(10_000),
  dueAt: z.string().datetime(),
  published: z.boolean().default(false),
});
export const submissionInputSchema = z
  .object({
    content: z.string().trim().max(20_000).default(''),
    linkUrl: z.string().url().max(500).or(z.literal('')).default(''),
  })
  .refine((value) => value.content.length > 0 || value.linkUrl.length > 0, {
    message: 'Add written work or a link.',
  });
export const gradeInputSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string().trim().max(5000).default(''),
});
export const memberInputSchema = z.object({ userId: z.string().uuid() });

export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type ClassInput = z.infer<typeof classInputSchema>;
export type LessonInput = z.infer<typeof lessonInputSchema>;
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;
export type SubmissionInput = z.infer<typeof submissionInputSchema>;
export type GradeInput = z.infer<typeof gradeInputSchema>;
