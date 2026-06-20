import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;
const DEFAULT_APP_TIME_ZONE = 'Europe/Chisinau';
const PROGRAM_CODES = new Set(['fitness', 'running', 'sleep', 'reading']);

function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function getEnv(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

function getTodayDate(timeZone = DEFAULT_APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function timingSafeHexEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Telegram initData is missing');
  }
  if (!botToken) {
    throw new Error('Telegram bot token is missing');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new Error('Telegram initData hash is missing');
  }
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!timingSafeHexEqual(calculatedHash, hash)) {
    throw new Error('Telegram initData hash is invalid');
  }

  const authDate = Number(params.get('auth_date') || 0);
  const maxAge = Number(
    process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS || DEFAULT_INIT_DATA_MAX_AGE_SECONDS
  );
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!authDate || ageSeconds < -60 || ageSeconds > maxAge) {
    throw new Error('Telegram initData is expired');
  }

  const rawUser = params.get('user');
  if (!rawUser) {
    throw new Error('Telegram user is missing');
  }

  const user = JSON.parse(rawUser);
  if (!user?.id) {
    throw new Error('Telegram user id is missing');
  }
  return user;
}

async function resolveUserId(supabase, telegramUser) {
  const { data, error } = await supabase.rpc('get_or_create_user', {
    p_telegram_id: telegramUser.id,
    p_username: telegramUser.username || null,
    p_first_name: telegramUser.first_name || 'Telegram',
  });
  if (error) throw error;
  return data;
}

async function callRpc(supabase, name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function processStreakRewards(supabase, userId) {
  return Number(await callRpc(supabase, 'process_streak_freeze_rewards', {
    p_user_id: userId,
  }) || 0);
}

async function processAchievementRewards(supabase, userId) {
  return Number(await callRpc(supabase, 'process_achievement_freeze_rewards', {
    p_user_id: userId,
  }) || 0);
}

async function checkAchievementsAndProcessRewards(supabase, userId) {
  await callRpc(supabase, 'check_and_unlock_achievements', {
    p_user_id: userId,
  });
  return processAchievementRewards(supabase, userId);
}

async function refreshChallengeLifecycle(supabase) {
  try {
    return await callRpc(supabase, 'refresh_challenge_lifecycle');
  } catch (error) {
    console.error('Challenge lifecycle refresh failed:', error);
    return null;
  }
}

async function freezeDailyGoal(supabase, userId, goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal id is missing');
  }
  return Boolean(await callRpc(supabase, 'freeze_daily_goal', {
    p_user_id: userId,
    p_goal_id: goalId,
    p_date: getTodayDate(process.env.APP_TIME_ZONE || DEFAULT_APP_TIME_ZONE),
  }));
}

async function completeGoal(supabase, userId, goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal id is missing');
  }
  await refreshChallengeLifecycle(supabase);
  return callRpc(supabase, 'complete_goal', {
    p_user_id: userId,
    p_goal_id: goalId,
    p_date: getTodayDate(process.env.APP_TIME_ZONE || DEFAULT_APP_TIME_ZONE),
  });
}

async function skipGoal(supabase, userId, goalId) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal id is missing');
  }
  return callRpc(supabase, 'skip_goal', {
    p_user_id: userId,
    p_goal_id: goalId,
    p_date: getTodayDate(process.env.APP_TIME_ZONE || DEFAULT_APP_TIME_ZONE),
  });
}

async function completeProgramDay(
  supabase,
  userId,
  programCode,
  programId,
  expectedDay
) {
  if (!PROGRAM_CODES.has(programCode)) {
    throw new Error('Invalid program code');
  }
  if (!Number.isInteger(expectedDay) || expectedDay < 1 || expectedDay > 30) {
    throw new Error('Invalid program day');
  }
  if (programId != null && typeof programId !== 'string') {
    throw new Error('Invalid program id');
  }

  await refreshChallengeLifecycle(supabase);
  return callRpc(supabase, 'complete_program_day', {
    p_user_id: userId,
    p_program_code: programCode,
    p_program_id: programId || null,
    p_expected_day: expectedDay,
  });
}

export async function completeProgramDayWithAchievements(
  supabase,
  userId,
  programCode,
  programId,
  expectedDay
) {
  const result = await completeProgramDay(
    supabase,
    userId,
    programCode,
    programId,
    expectedDay
  );
  let achievementRewards = 0;
  if (result?.applied) {
    try {
      achievementRewards = await checkAchievementsAndProcessRewards(supabase, userId);
    } catch (error) {
      console.error('Achievement processing failed after program completion:', error);
    }
  }
  return { result, achievementRewards };
}

export function classifyRewardsError(error) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code || '')
    : '';
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String(error.message || '')
      : 'Reward request failed';

  if (message.startsWith('Telegram ') || message.includes('Server environment')) {
    return { statusCode: 401, message };
  }
  if (code === '42501') return { statusCode: 403, message };
  if (code === 'P0002') return { statusCode: 404, message };
  if (code === '23505' || code === '55000' || code === '40001') {
    return { statusCode: 409, message };
  }
  if (code === '22023' || message.startsWith('Invalid ') || message.endsWith(' is missing')) {
    return { statusCode: 400, message };
  }
  return { statusCode: 500, message };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const botToken = getEnv('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Server environment is not configured');
    }

    const {
      action,
      initData,
      goalId,
      programCode,
      programId,
      expectedDay,
    } = getBody(req);
    const telegramUser = verifyTelegramInitData(initData, botToken);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = await resolveUserId(supabase, telegramUser);

    if (action === 'completeGoal') {
      const result = await completeGoal(supabase, userId, goalId);
      const streakRewards = result?.applied
        ? await processStreakRewards(supabase, userId)
        : 0;
      const achievementRewards = result?.applied
        ? await checkAchievementsAndProcessRewards(supabase, userId)
        : 0;
      return json(res, 200, {
        success: true,
        result,
        streakRewards,
        achievementRewards,
      });
    }

    if (action === 'skipGoal') {
      const result = await skipGoal(supabase, userId, goalId);
      const achievementRewards = result?.applied
        ? await checkAchievementsAndProcessRewards(supabase, userId)
        : 0;
      return json(res, 200, { success: true, result, achievementRewards });
    }

    if (action === 'freezeDailyGoal') {
      const frozen = await freezeDailyGoal(supabase, userId, goalId);
      const achievementRewards = frozen
        ? await checkAchievementsAndProcessRewards(supabase, userId)
        : 0;
      return json(res, 200, { success: true, frozen, achievementRewards });
    }

    if (action === 'completeProgramDay') {
      const { result, achievementRewards } = await completeProgramDayWithAchievements(
        supabase,
        userId,
        programCode,
        programId,
        expectedDay
      );
      return json(res, 200, { success: true, result, achievementRewards });
    }

    if (action === 'processStreakRewards') {
      const streakRewards = await processStreakRewards(supabase, userId);
      return json(res, 200, { success: true, streakRewards });
    }

    if (action === 'checkAchievementsAndProcessRewards') {
      const achievementRewards = await checkAchievementsAndProcessRewards(supabase, userId);
      return json(res, 200, { success: true, achievementRewards });
    }

    if (action === 'processRewards') {
      const streakRewards = await processStreakRewards(supabase, userId);
      const achievementRewards = await checkAchievementsAndProcessRewards(supabase, userId);
      return json(res, 200, { success: true, streakRewards, achievementRewards });
    }

    return json(res, 400, { success: false, error: 'Unknown action' });
  } catch (error) {
    const classified = classifyRewardsError(error);
    console.error('Rewards API error:', error);
    return json(res, classified.statusCode, {
      success: false,
      error: classified.message,
    });
  }
}
