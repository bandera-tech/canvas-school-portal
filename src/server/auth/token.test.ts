import { describe, expect, it } from 'vitest';
import { createSessionToken, readSessionToken } from './token.js';

const secret = 'test-secret-that-is-longer-than-thirty-two-characters';

describe('session tokens', () => {
  it('round-trips the user identity and role', () => {
    const token = createSessionToken(
      '10000000-0000-4000-8000-000000000001',
      'admin',
      secret
    );
    expect(readSessionToken(token, secret)).toEqual({
      sub: '10000000-0000-4000-8000-000000000001',
      role: 'admin',
    });
  });

  it('rejects a token signed with another secret', () => {
    const token = createSessionToken(
      '10000000-0000-4000-8000-000000000002',
      'teacher',
      secret
    );
    expect(() => readSessionToken(token, `${secret}-different`)).toThrow();
  });
});
