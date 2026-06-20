import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(['fitness', 'running', 'sleep', 'reading', 'goals', 'programs']);
const VISIBILITIES = new Set(['public', 'link_only', 'private']);
const JOIN_MODES = new Set(['instant', 'approval', 'invite_only']);
const METRICS = new Set(['goals_completed', 'program_days_completed']);
const MODES = new Set(['highest_score', 'first_to_target']);
const SCOPES = new Set(['invitations', 'active', 'history', 'all']);
const SORTS = new Set(['newest', 'popular', 'starting_soon', 'recommended']);
const RESPONSE_ACTIONS = new Set(['accept_invite', 'decline_invite', 'approve_request', 'reject_request']);
const REPORT_REASONS = new Set(['spam', 'abuse', 'misleading', 'unsafe', 'other']);

function json(res, statusCode, payload) { res.status(statusCode).json(payload); }
function getEnv(name, fallbackName) { return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined); }
function getBody(req) { if (!req.body) return {}; return typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }

function timingSafeHexEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length > 0 && leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') throw new Error('Telegram initData is missing');
  if (!botToken) throw new Error('Telegram bot token is missing');
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Telegram initData hash is missing');
  params.delete('hash');
  const dataCheckString = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!timingSafeHexEqual(calculatedHash, hash)) throw new Error('Telegram initData hash is invalid');
  const authDate = Number(params.get('auth_date') || 0);
  const maxAge = Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS || DEFAULT_INIT_DATA_MAX_AGE_SECONDS);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!authDate || ageSeconds < -60 || ageSeconds > maxAge) throw new Error('Telegram initData is expired');
  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram user is missing');
  const user = JSON.parse(rawUser);
  if (!user?.id) throw new Error('Telegram user id is missing');
  return user;
}

function requireObject(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} is required`); return value; }
function requireString(value, name, maxLength, minLength = 1) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  const normalized = value.trim();
  if (normalized.length < minLength) throw new Error(`${name} is too short`);
  if (maxLength && normalized.length > maxLength) throw new Error(`${name} is too long`);
  return normalized;
}
function optionalString(value, name, maxLength) { return value == null || value === '' ? null : requireString(value, name, maxLength); }
function requireUuid(value, name) { const normalized = requireString(value, name, 64); if (!UUID_PATTERN.test(normalized)) throw new Error(`${name} is invalid`); return normalized; }
function optionalUuid(value, name) { return value == null || value === '' ? null : requireUuid(value, name); }
function requireEnum(value, values, name) { if (typeof value !== 'string' || !values.has(value)) throw new Error(`${name} is invalid`); return value; }
function optionalTimestamp(value, name) {
  if (value == null || value === '') return null;
  const normalized = requireString(value, name, 64);
  if (Number.isNaN(Date.parse(normalized))) throw new Error(`${name} is invalid`);
  return new Date(normalized).toISOString();
}
function positiveInteger(value, name) { if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`); return value; }

export function validateCreateChallengeInput(value) {
  const input = requireObject(value, 'challenge');
  const mode = requireEnum(input.mode, MODES, 'mode');
  const visibility = requireEnum(input.visibility, VISIBILITIES, 'visibility');
  const joinMode = requireEnum(input.joinMode, JOIN_MODES, 'joinMode');
  const durationDays = positiveInteger(input.durationDays, 'durationDays');
  if (![1, 3, 7].includes(durationDays)) throw new Error('durationDays is invalid');
  const targetValue = mode === 'first_to_target' ? positiveInteger(input.targetValue, 'targetValue') : null;
  const invitedUserId = optionalUuid(input.invitedUserId, 'invitedUserId');
  if ((visibility === 'private' || joinMode === 'invite_only') && !invitedUserId) throw new Error('invitedUserId is required');
  return {
    title: requireString(input.title, 'title', 120, 3),
    description: optionalString(input.description, 'description', 1000),
    category: requireEnum(input.category, CATEGORIES, 'category'),
    visibility,
    joinMode,
    metricType: requireEnum(input.metricType, METRICS, 'metricType'),
    mode,
    targetValue,
    durationDays,
    startsAt: optionalTimestamp(input.startsAt, 'startsAt'),
    registrationEndsAt: optionalTimestamp(input.registrationEndsAt, 'registrationEndsAt'),
    invitedUserId,
  };
}

function validateCatalogFilters(value) {
  const filters = value == null ? {} : requireObject(value, 'filters');
  const page = filters.page == null ? 1 : positiveInteger(filters.page, 'page');
  const pageSize = filters.pageSize == null ? 20 : positiveInteger(filters.pageSize, 'pageSize');
  const durationDays = filters.durationDays == null ? null : positiveInteger(filters.durationDays, 'durationDays');
  if (durationDays != null && ![1, 3, 7].includes(durationDays)) throw new Error('durationDays is invalid');
  return {
    category: filters.category == null || filters.category === '' ? null : requireEnum(filters.category, CATEGORIES, 'category'),
    search: optionalString(filters.search, 'search', 120),
    durationDays,
    sort: filters.sort == null ? 'newest' : requireEnum(filters.sort, SORTS, 'sort'),
    page,
    pageSize: Math.min(pageSize, 50),
  };
}

async function resolveUserId(supabase, telegramUser) {
  const { data, error } = await supabase.rpc('get_or_create_user', { p_telegram_id: telegramUser.id, p_username: telegramUser.username || null, p_first_name: telegramUser.first_name || 'Telegram' });
  if (error) throw error;
  return data;
}
async function callRpc(supabase, name, args) { const { data, error } = await supabase.rpc(name, args); if (error) throw error; return data; }

export function classifyChallengeError(error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code || '') : '';
  const message = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? String(error.message || '') : 'Challenge request failed';
  if (message.startsWith('Telegram ') || message.includes('Server environment')) return { statusCode: 401, message };
  if (code === '42501') return { statusCode: 403, message };
  if (code === 'P0002') return { statusCode: 404, message };
  if (code === '23505' || code === '55000') return { statusCode: 409, message };
  if (code === '54000') return { statusCode: 429, message };
  if (code === '22023' || code === '23514' || message.includes(' is invalid') || message.includes(' is required') || message.includes(' must be ') || message.includes(' is too ')) return { statusCode: 400, message };
  return { statusCode: 500, message };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' });
  try {
    const botToken = getEnv('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!botToken || !supabaseUrl || !serviceRoleKey) throw new Error('Server environment is not configured');
    const body = getBody(req);
    const telegramUser = verifyTelegramInitData(body.initData, botToken);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const userId = await resolveUserId(supabase, telegramUser);

    if (body.action === 'listPublic') {
      const filters = validateCatalogFilters(body.filters);
      const challenges = await callRpc(supabase, 'list_public_challenges', { p_category: filters.category, p_search: filters.search, p_duration_days: filters.durationDays, p_sort: filters.sort, p_page: filters.page, p_page_size: filters.pageSize });
      return json(res, 200, { success: true, challenges });
    }
    if (body.action === 'create') {
      const challenge = validateCreateChallengeInput(body.challenge);
      const result = await callRpc(supabase, 'create_challenge', { p_created_by: userId, p_title: challenge.title, p_description: challenge.description, p_category: challenge.category, p_visibility: challenge.visibility, p_join_mode: challenge.joinMode, p_metric_type: challenge.metricType, p_mode: challenge.mode, p_target_value: challenge.targetValue, p_duration_days: challenge.durationDays, p_starts_at: challenge.startsAt, p_registration_ends_at: challenge.registrationEndsAt, p_invited_user_id: challenge.invitedUserId });
      return json(res, 200, { success: true, result });
    }
    if (body.action === 'join') {
      const result = await callRpc(supabase, 'join_challenge', { p_user_id: userId, p_challenge_id: requireUuid(body.challengeId, 'challengeId'), p_invite_token: optionalUuid(body.inviteToken, 'inviteToken') });
      return json(res, 200, { success: true, result });
    }
    if (body.action === 'respond') {
      const responseAction = requireEnum(body.responseAction, RESPONSE_ACTIONS, 'responseAction');
      const targetUserId = responseAction === 'accept_invite' || responseAction === 'decline_invite' ? userId : requireUuid(body.targetUserId, 'targetUserId');
      const result = await callRpc(supabase, 'respond_challenge_participation', { p_actor_user_id: userId, p_challenge_id: requireUuid(body.challengeId, 'challengeId'), p_target_user_id: targetUserId, p_action: responseAction });
      return json(res, 200, { success: true, result });
    }
    if (body.action === 'cancel') {
      const cancelled = await callRpc(supabase, 'cancel_challenge', { p_user_id: userId, p_challenge_id: requireUuid(body.challengeId, 'challengeId') });
      return json(res, 200, { success: true, cancelled: Boolean(cancelled) });
    }
    if (body.action === 'listMine') {
      const scope = body.scope == null ? 'active' : requireEnum(body.scope, SCOPES, 'scope');
      const challenges = await callRpc(supabase, 'list_user_challenges', { p_user_id: userId, p_scope: scope });
      return json(res, 200, { success: true, challenges });
    }
    if (body.action === 'report') {
      const reported = await callRpc(supabase, 'report_challenge', { p_reporter_user_id: userId, p_challenge_id: requireUuid(body.challengeId, 'challengeId'), p_reason: requireEnum(body.reason, REPORT_REASONS, 'reason'), p_details: optionalString(body.details, 'details', 1000) });
      return json(res, 200, { success: true, reported: Boolean(reported) });
    }
    return json(res, 400, { success: false, error: 'Unknown action' });
  } catch (error) {
    const classified = classifyChallengeError(error);
    console.error('Challenges API error:', error);
    return json(res, classified.statusCode, { success: false, error: classified.message });
  }
}
