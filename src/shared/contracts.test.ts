import { describe, expect, it } from 'vitest';
import {
  gradeInputSchema,
  loginSchema,
  submissionInputSchema,
  userInputSchema,
} from './contracts.js';

describe('request contracts', () => {
  it('normalizes login emails', () => {
    expect(
      loginSchema.parse({ email: 'USER@EXAMPLE.COM', password: 'password1' })
        .email
    ).toBe('user@example.com');
  });

  it('validates managed users and grades', () => {
    expect(
      userInputSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        password: 'password1',
      }).success
    ).toBe(true);
    expect(
      gradeInputSchema.safeParse({ grade: 101, feedback: '' }).success
    ).toBe(false);
  });

  it('requires submission text or a valid link', () => {
    expect(
      submissionInputSchema.safeParse({ content: '', linkUrl: '' }).success
    ).toBe(false);
    expect(
      submissionInputSchema.safeParse({ content: 'My answer', linkUrl: '' })
        .success
    ).toBe(true);
  });
});
