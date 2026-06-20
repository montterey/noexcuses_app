import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [goalsSource, programsSource, rewardsSource, migrationSource] = await Promise.all([
  readFile(new URL('../src/hooks/useGoals.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/usePrograms.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/rewards.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260620170000_014_verified_activity_and_challenge_scoring.sql', import.meta.url), 'utf8'),
]);

test('goal completion and skipping use the server API', () => {
  assert.ok(goalsSource.includes("callRewardsApi('completeGoal'"));
  assert.ok(goalsSource.includes("callRewardsApi('skipGoal'"));
  assert.ok(!goalsSource.includes("from('goal_logs').insert"));
  assert.ok(!goalsSource.includes("from('users').update"));
});

test('all programs use atomic completion', () => {
  assert.ok(programsSource.includes("action: 'completeProgramDay'"));
  assert.ok(programsSource.includes('programCode,'));
  assert.ok(!programsSource.includes("from('user_programs').update"));
  assert.ok(!programsSource.includes("from('user_programs').upsert"));
});

test('rewards API supports every program and goal action', () => {
  for (const code of ['fitness', 'running', 'sleep', 'reading']) {
    assert.ok(rewardsSource.includes(`'${code}'`));
  }
  assert.ok(rewardsSource.includes("action === 'completeGoal'"));
  assert.ok(rewardsSource.includes("action === 'skipGoal'"));
});

test('migration includes verified scoring and finalization', () => {
  assert.ok(migrationSource.includes('FUNCTION public.complete_goal'));
  assert.ok(migrationSource.includes('FUNCTION public.complete_program_day'));
  assert.ok(migrationSource.includes('FUNCTION public.apply_activity_event_to_challenges'));
  assert.ok(migrationSource.includes('FUNCTION public.finalize_challenge'));
  assert.ok(migrationSource.includes('ON CONFLICT(idempotency_key)'));
  assert.ok(migrationSource.includes('v_goal_created_at<=c.starts_at'));
  assert.ok(migrationSource.includes('v_goal_daily_count>=10'));
});
