import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/ProgramDetail.tsx', import.meta.url),
  'utf8'
);

test('fitness days 5-30 use circuit ordering', () => {
  assert.match(source, /programCode === 'fitness'\) return programDay >= 5/);
  assert.match(
    source,
    /shouldInterleaveProgramSets\(programCode, programDay, dayContent\.exercises\)/
  );
});

test('other programs interleave only real multi-set exercise sequences', () => {
  const helperStart = source.indexOf('function shouldInterleaveProgramSets');
  const helperEnd = source.indexOf('function buildWorkoutQueue');
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /exercise\.type !== 'task'/);
  assert.match(helper, /nonTaskExercises\.length > 1/);
  assert.match(helper, /getTotalSets\(exercise\) > 1/);
});

test('sleep and reading task-only days remain sequential', () => {
  assert.match(source, /exercise\.type === 'task'[\s\S]*?\? 1/);
  assert.doesNotMatch(source, /programCode === 'sleep'.*return true/);
  assert.doesNotMatch(source, /programCode === 'reading'.*return true/);
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
  assert.match(source, /programCode === 'fitness'\) return programDay >= 5/);
});
