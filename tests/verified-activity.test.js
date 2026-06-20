import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [goalsSource, programsSource, rewardsSource, migrationSource] = await Promise.all([
  readFile(new URL('../src/hooks/useGoals.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/usePrograms.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/rewards.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260620170000_014_verified_activity_and_challenge_scoring.sql', import.meta.url), 'utf8'),
]);

test('goal completion and skipping are routed through the rewards API', () => {
  assert.match(goalsSource, /callRewardsApi\('completeGoal'/);
  assert.match(goalsSource, /callRewardsApi\('skipGoal'/);
  assert.doesNotMatch(goalsSource, /from\('goal_logs'\)\.insert/);
  assert.doesNotMatch(goalsSource, /from\('users'\)\s*\.update/);
});

test('all programs use the atomic completion endpoint', () => {
  assert.match(programsSource, /action: 'completeProgramDay'/);
  assert.match(programsSource, /programCode,/);
  assert.doesNotMatch(programsSource, /from\('user_programs'\)\s*\.update/);
  assert.doesNotMatch(programsSource, /from\('user_programs'\)\s*\.upsert/);
});

test('rewards API accepts every supported program', () => {
  for (const code of ['fitness', 'running', 'sleep', 'reading']) {
    assert.match(rewardsSource, new RegExp(`['\"]${code}['\"]`));
  }
  assert.match(rewardsSource, /action === 'completeGoal'/);
  assert.match(rewardsSource, /action === 'skipGoal'/);
});

test('migration creates idempotent activity scoring and finalization', () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.complete_goal/);
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.complete_program_day/);
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.apply_activity_event_to_challenges/);
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.finalize_challenge/);
  assert.match(migrationSource, /ON CONFLICT\(idempotency_key\)/);
  assert.match(migrationSource, /goal_created_at.*<=c\.starts_at/s);
  assert.match(migrationSource, /v_goal_daily_count>=10/);
});
