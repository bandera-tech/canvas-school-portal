import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'eslint.cmd' : 'eslint';
const result = spawnSync(command, ['.', '--max-warnings=0'], {
  stdio: 'inherit',
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
