import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;

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

function timingSafeHexEqual(a, b) {
  const aBuffer = Buffer.from(a, 'hex');
  const bBuffer = Buffer.from(b, 'hex');

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Telegram initData is missing');
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
  const maxAge = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS || DEFAULT_INIT_DATA_MAX_AGE_SECONDS);

  if (!authDate || Date.now() / 1000 - authDate > maxAge) {
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

async function processStreakRewards(supabase, userId) {
  const { data, error } = await supabase.rpc('process_streak_freeze_rewards', {
    p_user_id: userId,
  });

  if (error) throw error;
  return Number(data || 0);
}

async function processAchievementRewards(supabase, userId) {
  const { data, error } = await supabase.rpc('process_achievement_freeze_rewards', {
    p_user_id: userId,
  });

  if (error) throw error;
  return Number(data || 0);
}

async function checkAchievementsAndProcessRewards(supabase, userId) {
  const { error } = await supabase.rpc('check_and_unlock_achievements', {
    p_user_id: userId,
  });

  if (error) throw error;
  return processAchievementRewards(supabase, userId);
}

async function freezeDailyGoal(supabase, userId, goalId, date) {
  if (!goalId || typeof goalId !== 'string') {
    throw new Error('Goal id is missing');
  }

  const { data, error } = await supabase.rpc('freeze_daily_goal', {
    p_user_id: userId,
    p_goal_id: goalId,
    p_date: date || new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  return Boolean(data);
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

    const { action, initData, goalId, date } = getBody(req);
    const telegramUser = verifyTelegramInitData(initData, botToken);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const userId = await resolveUserId(supabase, telegramUser);

    if (action === 'freezeDailyGoal') {
      const frozen = await freezeDailyGoal(supabase, userId, goalId, date);
      const achievementRewards = frozen
        ? await checkAchievementsAndProcessRewards(supabase, userId)
        : 0;
      return json(res, 200, { success: true, frozen, achievementRewards });
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
    console.error('Rewards API error:', error);
    return json(res, 401, {
      success: false,
      error: error instanceof Error ? error.message : 'Unauthorized',
    });
  }
}
