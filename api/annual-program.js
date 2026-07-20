import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;
const TOTAL_SESSIONS = 208;

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

function timingSafeHexEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAnnualProgramInitData(initData, botToken) {
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
    process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS
      || DEFAULT_INIT_DATA_MAX_AGE_SECONDS
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

async function callRpc(supabase, name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function resolveUserId(supabase, telegramUser) {
  return callRpc(supabase, 'get_or_create_user', {
    p_telegram_id: telegramUser.id,
    p_username: telegramUser.username || null,
    p_first_name: telegramUser.first_name || 'Telegram',
  });
}

async function refreshChallengeLifecycle(supabase) {
  try {
    return await callRpc(supabase, 'refresh_challenge_lifecycle');
  } catch (error) {
    console.error('Challenge lifecycle refresh failed:', error);
    return null;
  }
}

async function processAchievements(supabase, userId) {
  try {
    await callRpc(supabase, 'check_and_unlock_achievements', {
      p_user_id: userId,
    });

    return Number(
      await callRpc(supabase, 'process_achievement_freeze_rewards', {
        p_user_id: userId,
      }) || 0
    );
  } catch (error) {
    console.error('Achievement processing failed after annual workout:', error);
    return 0;
  }
}

export function classifyAnnualProgramError(error) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code || '')
    : '';

  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String(error.message || '')
      : 'Annual program request failed';

  if (message.startsWith('Telegram ')) {
    return { statusCode: 401, message };
  }

  if (code === '42501') return { statusCode: 403, message };
  if (code === 'P0002') return { statusCode: 404, message };

  if (code === '23505' || code === '55000' || code === '40001') {
    return { statusCode: 409, message };
  }

  if (
    code === '22023'
    || message.startsWith('Invalid ')
    || message.endsWith(' is missing')
  ) {
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
      initData,
      programCode,
      programId,
      expectedDay,
    } = getBody(req);

    if (programCode !== 'home_year') {
      throw new Error('Invalid program code');
    }

    if (
      !Number.isInteger(expectedDay)
      || expectedDay < 1
      || expectedDay > TOTAL_SESSIONS
    ) {
      throw new Error('Invalid program day');
    }

    if (programId != null && typeof programId !== 'string') {
      throw new Error('Invalid program id');
    }

    const telegramUser = verifyAnnualProgramInitData(initData, botToken);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const userId = await resolveUserId(supabase, telegramUser);
    await refreshChallengeLifecycle(supabase);

    const result = await callRpc(
      supabase,
      'complete_annual_home_program_day',
      {
        p_user_id: userId,
        p_program_id: programId || null,
        p_expected_day: expectedDay,
      }
    );

    const achievementRewards = result?.applied
      ? await processAchievements(supabase, userId)
      : 0;

    return json(res, 200, {
      success: true,
      result,
      achievementRewards,
    });
  } catch (error) {
    const classified = classifyAnnualProgramError(error);
    console.error('Annual program API error:', error);

    return json(res, classified.statusCode, {
      success: false,
      error: classified.message,
    });
  }
}
