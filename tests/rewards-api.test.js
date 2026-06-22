import assert from 'node:assert/strict';
import test from 'node:test';

import { completeProgramDayWithAchievements } from '../api/rewards.js';

test('achievement failure does not cancel a saved program day', async () => {
  const completion = {
    applied: true,
    current_day: 2,
    completed: false,
    xp_awarded: 25,
  };
  const loggedErrors = [];
  const rpcCalls = [];
  const originalConsoleError = console.error;
  const supabase = {
    async rpc(name) {
      rpcCalls.push(name);

      if (name === 'refresh_challenge_lifecycle') {
        return { data: { activated: 0, expired: 0, completed: 0 }, error: null };
      }

      if (name === 'complete_program_day') {
        return { data: completion, error: null };
      }

      if (name === 'check_and_unlock_achievements') {
        return { data: null, error: new Error('achievement check failed') };
      }

      throw new Error(`Unexpected RPC: ${name}`);
    },
  };

  console.error = (...args) => loggedErrors.push(args);

  try {
    const response = await completeProgramDayWithAchievements(
      supabase,
      '00000000-0000-0000-0000-000000000001',
      'running',
      null,
      1
    );

    assert.deepEqual(response.result, completion);
    assert.equal(response.achievementRewards, 0);
    assert.equal(loggedErrors.length, 1);
    assert.deepEqual(rpcCalls.slice(0, 2), [
      'refresh_challenge_lifecycle',
      'complete_program_day',
    ]);
  } finally {
    console.error = originalConsoleError;
  }
});

test('an idempotent completion response keeps applied false and zero XP', async () => {
  const completion = {
    applied: false,
    current_day: 2,
    completed: false,
    xp_awarded: 0,
  };
  const supabase = {
    async rpc(name) {
      if (name === 'refresh_challenge_lifecycle') {
        return { data: { activated: 0, expired: 0, completed: 0 }, error: null };
      }

      if (name === 'complete_program_day') {
        return { data: completion, error: null };
      }

      return { data: 0, error: null };
    },
  };

  const response = await completeProgramDayWithAchievements(
    supabase,
    '00000000-0000-0000-0000-000000000001',
    'running',
    '00000000-0000-0000-0000-000000000002',
    1
  );

  assert.equal(response.result.applied, false);
  assert.equal(response.result.xp_awarded, 0);
});
