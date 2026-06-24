import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

test('eslint passes without errors', async () => {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  try {
    await execFileAsync(npmCommand, ['run', 'lint'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const output = [error?.stdout, error?.stderr].filter(Boolean).join('\n');
    assert.fail(output || error?.message || 'ESLint failed');
  }
});
