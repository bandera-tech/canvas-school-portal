import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', env: process.env });
  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const compile = run(npmCommand, [
  'exec',
  'tsc',
  '--',
  '-p',
  'tsconfig.server.json',
]);
compile.on('exit', (code) => {
  if (code !== 0) return;
  run(npmCommand, [
    'exec',
    'tsc',
    '--',
    '-p',
    'tsconfig.server.json',
    '--watch',
  ]);
  run(process.execPath, ['--watch', 'dist/server/server.js']);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
  });
}
