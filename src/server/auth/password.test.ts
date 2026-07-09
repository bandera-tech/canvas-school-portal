import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('passwords', () => {
  it('creates salted hashes and verifies the matching password', async () => {
    const first = await hashPassword('Correct horse battery staple');
    const second = await hashPassword('Correct horse battery staple');
    expect(first).not.toBe(second);
    await expect(
      verifyPassword('Correct horse battery staple', first)
    ).resolves.toBe(true);
    await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPassword('password', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('password', ':missing-salt')).resolves.toBe(
      false
    );
  });
});
