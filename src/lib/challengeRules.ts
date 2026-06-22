import type { ChallengeCategory, ChallengeMetric } from '../types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function metricForCategory(category: ChallengeCategory): ChallengeMetric {
  return category === 'goals' ? 'goals_completed' : 'program_days_completed';
}

export function isValidUuid(value: string) {
  return UUID_PATTERN.test(value);
}
