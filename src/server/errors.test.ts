import { describe, expect, it } from 'vitest';
import { conflict, forbidden, notFound } from './errors.js';

describe('application errors', () => {
  it('creates consistent not found, forbidden, and conflict errors', () => {
    expect(notFound()).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(forbidden()).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(conflict('Duplicate')).toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Duplicate',
    });
  });
});
