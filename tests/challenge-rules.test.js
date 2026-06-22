import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidUuid, metricForCategory } from '../src/lib/challengeRules.ts';

test('goals challenges count completed goals', () => {
  assert.equal(metricForCategory('goals'), 'goals_completed');
});

test('all program categories count completed program days', () => {
  for (const category of ['fitness', 'running', 'sleep', 'reading', 'programs']) {
    assert.equal(metricForCategory(category), 'program_days_completed');
  }
});

test('invited user id validation accepts only UUID values', () => {
  assert.equal(isValidUuid('123e4567-e89b-42d3-a456-426614174000'), true);
  assert.equal(isValidUuid('telegram-user-123'), false);
});
