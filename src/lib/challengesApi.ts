import {
  ChallengeActionResult,
  ChallengeCatalogItem,
  ChallengeCategory,
  ChallengeFormat,
  ChallengeJoinMode,
  ChallengeMetric,
  ChallengeMode,
  ChallengeParticipantStatus,
  ChallengePublicFilters,
  ChallengeResponseAction,
  ChallengeResult,
  ChallengeScope,
  ChallengeStatus,
  ChallengeVisibility,
  CreateChallengeInput,
  UserChallengeListItem,
} from '../types';

type JsonRecord = Record<string, unknown>;

interface ChallengeApiEnvelope {
  success?: boolean;
  challenges?: unknown;
  result?: unknown;
  cancelled?: boolean;
  error?: string;
}

function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Некорректный ответ: ${label}`);
  }
  return value as JsonRecord;
}

function valueOf(record: JsonRecord, snakeCase: string, camelCase: string) {
  return record[snakeCase] ?? record[camelCase];
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`Некорректный ответ: ${label}`);
  }
  return value;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCatalogItem(value: unknown): ChallengeCatalogItem {
  const item = asRecord(value, 'challenge');
  const durationDays = numberValue(valueOf(item, 'duration_days', 'durationDays'));
  const visibility = optionalString(item.visibility);
  const joinMode = optionalString(valueOf(item, 'join_mode', 'joinMode'));

  return {
    id: requiredString(item.id, 'challenge id'),
    title: requiredString(item.title, 'challenge title'),
    description: optionalString(item.description),
    category: requiredString(item.category, 'category') as ChallengeCategory,
    challengeFormat: requiredString(
      valueOf(item, 'challenge_format', 'challengeFormat'),
      'challenge format'
    ) as ChallengeFormat,
    metricType: requiredString(
      valueOf(item, 'metric_type', 'metricType'),
      'metric type'
    ) as ChallengeMetric,
    mode: requiredString(item.mode, 'mode') as ChallengeMode,
    targetValue: valueOf(item, 'target_value', 'targetValue') == null
      ? null
      : numberValue(valueOf(item, 'target_value', 'targetValue')),
    durationDays: durationDays as 1 | 3 | 7,
    maxParticipants: numberValue(valueOf(item, 'max_participants', 'maxParticipants'), 2),
    participantCount: numberValue(valueOf(item, 'participant_count', 'participantCount')),
    availablePlaces: numberValue(valueOf(item, 'available_places', 'availablePlaces')),
    startsAt: optionalString(valueOf(item, 'starts_at', 'startsAt')),
    registrationEndsAt: optionalString(
      valueOf(item, 'registration_ends_at', 'registrationEndsAt')
    ),
    creatorUsername: optionalString(valueOf(item, 'creator_username', 'creatorUsername')),
    creatorFirstName: requiredString(
      valueOf(item, 'creator_first_name', 'creatorFirstName'),
      'creator'
    ),
    createdAt: requiredString(valueOf(item, 'created_at', 'createdAt'), 'created at'),
    challengeStatus: (optionalString(
      valueOf(item, 'challenge_status', 'challengeStatus')
    ) || optionalString(item.status) || 'open') as ChallengeStatus,
    visibility: visibility ? visibility as ChallengeVisibility : undefined,
    joinMode: joinMode ? joinMode as ChallengeJoinMode : undefined,
  };
}

function normalizeMineItem(value: unknown): UserChallengeListItem {
  const item = asRecord(value, 'my challenge');
  const duration = valueOf(item, 'duration_days', 'durationDays');
  const participants = valueOf(item, 'participant_count', 'participantCount');

  return {
    challengeId: requiredString(valueOf(item, 'challenge_id', 'challengeId'), 'challenge id'),
    title: requiredString(item.title, 'challenge title'),
    category: requiredString(item.category, 'category') as ChallengeCategory,
    metricType: requiredString(
      valueOf(item, 'metric_type', 'metricType'),
      'metric type'
    ) as ChallengeMetric,
    mode: requiredString(item.mode, 'mode') as ChallengeMode,
    challengeStatus: requiredString(
      valueOf(item, 'challenge_status', 'challengeStatus'),
      'challenge status'
    ) as ChallengeStatus,
    participantStatus: requiredString(
      valueOf(item, 'participant_status', 'participantStatus'),
      'participant status'
    ) as ChallengeParticipantStatus,
    progress: numberValue(item.progress),
    result: requiredString(item.result, 'result') as ChallengeResult,
    startsAt: optionalString(valueOf(item, 'starts_at', 'startsAt')),
    endsAt: optionalString(valueOf(item, 'ends_at', 'endsAt')),
    createdAt: requiredString(valueOf(item, 'created_at', 'createdAt'), 'created at'),
    isCreator: valueOf(item, 'is_creator', 'isCreator') === true,
    durationDays: duration == null ? undefined : numberValue(duration) as 1 | 3 | 7,
    participantCount: participants == null ? undefined : numberValue(participants),
  };
}

async function challengeRequest(payload: JsonRecord): Promise<ChallengeApiEnvelope> {
  const initData = getTelegramInitData();
  if (!initData) throw new Error('Telegram initData недоступен');

  const response = await fetch('/api/challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, initData }),
  });
  const body = await response.json().catch(() => ({})) as ChallengeApiEnvelope;

  if (!response.ok || body.success !== true) {
    throw new Error(body.error || 'Не удалось выполнить запрос соревнований');
  }
  return body;
}

function challengeResult(value: unknown): ChallengeActionResult {
  const result = asRecord(value, 'challenge result');
  return {
    challengeId: requiredString(
      valueOf(result, 'challenge_id', 'challengeId'),
      'challenge id'
    ),
    challengeStatus: requiredString(
      valueOf(result, 'challenge_status', 'challengeStatus') ?? result.status,
      'challenge status'
    ) as ChallengeStatus,
    participantStatus: optionalString(
      valueOf(result, 'participant_status', 'participantStatus')
    ) as ChallengeParticipantStatus | undefined,
    inviteToken: optionalString(valueOf(result, 'invite_token', 'inviteToken')) || undefined,
  };
}

export async function listPublicChallenges(filters: ChallengePublicFilters) {
  const body = await challengeRequest({ action: 'listPublic', filters });
  if (!Array.isArray(body.challenges)) throw new Error('Некорректный список соревнований');
  return body.challenges.map(normalizeCatalogItem);
}

export async function listMyChallenges(scope: ChallengeScope) {
  const body = await challengeRequest({ action: 'listMine', scope });
  if (!Array.isArray(body.challenges)) throw new Error('Некорректный список соревнований');
  return body.challenges.map(normalizeMineItem);
}

export async function createChallenge(challenge: CreateChallengeInput) {
  const body = await challengeRequest({ action: 'create', challenge });
  return challengeResult(body.result);
}

export async function joinChallenge(challengeId: string) {
  const body = await challengeRequest({ action: 'join', challengeId });
  return challengeResult(body.result);
}

export async function respondToChallenge(
  challengeId: string,
  responseAction: ChallengeResponseAction
) {
  await challengeRequest({ action: 'respond', challengeId, responseAction });
}

export async function cancelChallenge(challengeId: string) {
  const body = await challengeRequest({ action: 'cancel', challengeId });
  return Boolean(body.cancelled);
}
