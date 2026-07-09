import { expect, test } from '@playwright/test';

const accounts = [
  {
    email: 'admin@canvas.test',
    password: 'AdminDemo123!',
    heading: 'School administration',
  },
  {
    email: 'teacher@canvas.test',
    password: 'TeacherDemo123!',
    heading: 'Teacher workspace',
  },
  {
    email: 'student@canvas.test',
    password: 'StudentDemo123!',
    heading: 'Student dashboard',
  },
];

for (const account of accounts) {
  test(`${account.email} sees the correct workspace`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(account.heading)).toBeVisible();
  });
}
