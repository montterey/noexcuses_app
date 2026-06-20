import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/ProgramDetail.tsx', import.meta.url),
  'utf8'
);
const completionMode = source.slice(source.indexOf("if (mode === 'complete')"));
const [fitnessBranch, runningBranch] = completionMode.split('\n    return (', 2);

test('fitness keeps its legacy completion screen', () => {
  assert.match(fitnessBranch, /if \(programCode !== 'running'\)/);
  assert.match(fitnessBranch, /День завершён!/);
  assert.match(fitnessBranch, /День \{overviewDayNumber\} выполнен/);
  assert.match(fitnessBranch, /\+25 XP/);
  assert.match(fitnessBranch, /Отметить день выполненным/);
  assert.doesNotMatch(fitnessBranch, /Тренировка закончена/);
  assert.doesNotMatch(fitnessBranch, /Сохранить результат/);
});

test('running remains neutral until the server confirms completion', () => {
  assert.match(runningBranch, /Тренировка закончена/);
  assert.match(runningBranch, /Сохранить результат/);
  assert.match(runningBranch, /Результат уже сохранён/);
  assert.doesNotMatch(runningBranch, /День завершён!/);
  assert.doesNotMatch(runningBranch, /\+25 XP/);
  assert.doesNotMatch(runningBranch, /\+500 XP/);
});
