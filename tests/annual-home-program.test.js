import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [
  typesSource,
  programsSource,
  hookSource,
  annualDetailSource,
  annualProgramSource,
  exercisesSource,
  targetsSource,
  templatesSource,
  apiSource,
  migrationSource,
] = await Promise.all([
  readFile(new URL('../src/types/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Programs.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/usePrograms.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AnnualProgramDetail.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/annualHomeProgram.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/annualHomeExercises.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/annualHomeTargets.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/annualHomeTemplates.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/annual-program.js', import.meta.url), 'utf8'),
  readFile(
    new URL(
      '../supabase/migrations/20260720230000_017_add_annual_home_program.sql',
      import.meta.url
    ),
    'utf8'
  ),
]);

function parseExportedJson(source, name) {
  const match = source.match(new RegExp(`${name}[^=]*= (.*);`));
  assert.ok(match, `Missing ${name}`);
  return JSON.parse(match[1]);
}

test('annual home workout is a separate program code and card', () => {
  assert.match(typesSource, /'home_year'/);
  assert.match(programsSource, /code: 'home_year'/);
  assert.match(programsSource, /title: 'Год домашних тренировок'/);
  assert.match(programsSource, /totalDays: ANNUAL_HOME_TOTAL_SESSIONS/);
  assert.match(programsSource, /selectedProgram\.code === 'home_year'/);
});

test('uploaded spreadsheet became a 208-session program with six exercises each', () => {
  const exercises = parseExportedJson(exercisesSource, 'ANNUAL_EXERCISES');
  const targets = parseExportedJson(targetsSource, 'ANNUAL_TARGETS');
  const templates = parseExportedJson(templatesSource, 'ANNUAL_SESSION_TEMPLATES');
  const offsets = parseExportedJson(templatesSource, 'ANNUAL_PHASE_TEMPLATE_OFFSETS');

  assert.equal(exercises.length, 147);
  assert.equal(targets.length, 172);
  assert.equal(templates.length, 56);
  assert.equal(offsets.length, 8);
  assert.ok(templates.every((session) => session.length === 6));
  assert.match(annualProgramSource, /ANNUAL_HOME_TOTAL_SESSIONS = 208/);
  assert.match(annualProgramSource, /ANNUAL_HOME_TOTAL_WEEKS = 52/);
  assert.match(annualProgramSource, /week === 52/);
  assert.match(annualProgramSource, /'Тест и разгрузка'/);
});

test('annual workout has its own progress endpoint and 208-session backend', () => {
  assert.match(hookSource, /programCode === 'home_year'/);
  assert.match(hookSource, /'\/api\/annual-program'/);
  assert.match(apiSource, /const TOTAL_SESSIONS = 208/);
  assert.match(apiSource, /complete_annual_home_program_day/);
  assert.match(migrationSource, /day_number BETWEEN 1 AND 208/);
  assert.match(migrationSource, /p_expected_day = 208/);
  assert.match(migrationSource, /program_code = 'home_year'/);
});

test('annual detail uses exercise guidance, interleaved sets, and deload messaging', () => {
  assert.match(annualDetailSource, /getAnnualExerciseGuide/);
  assert.match(annualDetailSource, /currentExercise\.guideIndex/);
  assert.match(annualDetailSource, /for \(let setNumber = 1; setNumber <= maxSets/);
  assert.match(annualDetailSource, /Разгрузочная неделя/);
  assert.match(annualDetailSource, /Годовая программа завершена/);
  assert.match(annualDetailSource, /isFinalSession \? 500 : 25/);
});
