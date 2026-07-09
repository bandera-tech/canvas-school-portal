import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['tests/e2e/**', '**/*.integration.test.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/server/auth/password.ts',
        'src/server/auth/token.ts',
        'src/server/errors.ts',
        'src/shared/contracts.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100,
      },
    },
  },
});
