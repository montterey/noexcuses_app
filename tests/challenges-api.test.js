import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  classifyChallengeError,
  validateCreateChallengeInput,
  verifyTelegramInitData,
} from '../api/challenges.js';

function createInitData({ botToken, user, authDate = Math.floor(Date.now() / 1000) }) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAE-test-query',
    user: JSON.stringify(user),
  });

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);
  return params.toString();
}

test('challenges API verifies valid Telegram initData', () => {
  const botToken = '123456:challenge-test-token';
  const user = { id: 123456789, username: 'diana', first_name: 'Diana' };
  const initData = createInitData({ botToken, user });

  assert.deepEqual(verifyTelegramInitData(initData, botToken), user);
});

test('challenges API rejects a modified Telegram signature', () => {
  const botToken = '123456:challenge-test-token';
  const initData = createInitData({
    botToken,
    user: { id: 123456789, username: 'diana', first_name: 'Diana' },
  }).replace('Diana', 'Other');

  assert.throws(
    () => verifyTelegramInitData(initData, botToken),
    /hash is invalid/
  );
});

test('challenge creation validator accepts a public goals duel', () => {
  const result = validateCreateChallengeInput({
    title: 'Больше выполненных целей',
    description: 'Соревнование на неделю',
    category: 'goals',
    visibility: 'public',
    joinMode: 'instant',
    metricType: 'goals_completed',
    mode: 'highest_score',
    durationDays: 7,
  });

  assert.equal(result.title, 'Больше выполненных целей');
  assert.equal(result.targetValue, null);
  assert.equal(result.durationDays, 7);
  assert.equal(result.invitedUserId, null);
});

test('challenge creation validator requires a target for first-to-target mode', () => {
  assert.throws(
    () => validateCreateChallengeInput({
      title: 'Первые пять дней программы',
      category: 'programs',
      visibility: 'public',
      joinMode: 'instant',
      metricType: 'program_days_completed',
      mode: 'first_to_target',
      durationDays: 3,
    }),
    /targetValue must be a positive integer/
  );
});

test('challenge creation validator requires an invited user for private challenges', () => {
  assert.throws(
    () => validateCreateChallengeInput({
      title: 'Приватный вызов',
      category: 'running',
      visibility: 'private',
      joinMode: 'invite_only',
      metricType: 'program_days_completed',
      mode: 'highest_score',
      durationDays: 1,
    }),
    /invitedUserId is required/
  );
});

test('challenge API maps database security and lifecycle errors', () => {
  assert.deepEqual(
    classifyChallengeError({ code: '42501', message: 'service_role required' }),
    { statusCode: 403, message: 'service_role required' }
  );
  assert.deepEqual(
    classifyChallengeError({ code: '55000', message: 'challenge is full' }),
    { statusCode: 409, message: 'challenge is full' }
  );
  assert.deepEqual(
    classifyChallengeError({ code: '54000', message: 'active challenge limit reached' }),
    { statusCode: 429, message: 'active challenge limit reached' }
  );
});
