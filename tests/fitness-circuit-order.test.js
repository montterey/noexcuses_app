import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/ProgramDetail.tsx', import.meta.url),
  'utf8'
);

test('fitness days 5-30 use circuit ordering', () => {
  assert.match(
    source,
    /programCode === 'fitness' && programDay >= 5/
  );
  assert.match(
    source,
    /buildWorkoutQueue\(dayContent\.exercises, shouldInterleaveSets\)/
  );
});

test('running repeated intervals also use circuit ordering', () => {
  assert.match(source, /\|\| programCode === 'running'/);
});

test('sleep and reading keep single-task sequential behavior', () => {
  const selectorStart = source.indexOf('const shouldInterleaveSets =');
  const selectorEnd = source.indexOf('const queue = dayContent', selectorStart);
  const selector = source.slice(selectorStart, selectorEnd);

  assert.doesNotMatch(selector, /programCode === 'sleep'/);
  assert.doesNotMatch(selector, /programCode === 'reading'/);
  assert.match(source, /exercise\.type === 'task'[\s\S]*?\? 1/);
});

test('circuit queue alternates exercises before moving to the next set', () => {
  const builderStart = source.indexOf('function buildWorkoutQueue');
  const builderEnd = source.indexOf('function normalizeExerciseName');
  const builder = source.slice(builderStart, builderEnd);
  const outerSetLoop = builder.indexOf('for (let set = 1; set <= maxSets; set++)');
  const innerExerciseLoop = builder.indexOf(
    'for (const { exercise, totalSets } of exercisesWithSets)'
  );

  assert.notEqual(outerSetLoop, -1);
  assert.notEqual(innerExerciseLoop, -1);
  assert.ok(outerSetLoop < innerExerciseLoop);
});

test('fitness days 1-4 keep the existing sequential order', () => {
  assert.match(source, /if \(!interleaveSets\)/);
});
