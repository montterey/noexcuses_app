import { useCallback, useState } from 'react';
import {
  ChallengeCatalogItem,
  ChallengePublicFilters,
  ChallengeResponseAction,
  ChallengeScope,
  CreateChallengeInput,
  UserChallengeListItem,
} from '../types';
import {
  cancelChallenge,
  createChallenge,
  joinChallenge,
  listMyChallenges,
  listPublicChallenges,
  respondToChallenge,
} from '../lib/challengesApi';

export function useChallenges() {
  const [publicChallenges, setPublicChallenges] = useState<ChallengeCatalogItem[]>([]);
  const [myChallenges, setMyChallenges] = useState<UserChallengeListItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [mineLoading, setMineLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [mineError, setMineError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdChallengeIds, setCreatedChallengeIds] = useState<Set<string>>(new Set());

  const loadPublic = useCallback(async (filters: ChallengePublicFilters) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setPublicChallenges(await listPublicChallenges(filters));
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Не удалось загрузить каталог');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadMine = useCallback(async (scope: ChallengeScope) => {
    setMineLoading(true);
    setMineError(null);
    try {
      const items = await listMyChallenges(scope);
      setMyChallenges(items.map((item) => ({
        ...item,
        isCreator: item.isCreator || createdChallengeIds.has(item.challengeId),
      })));
    } catch (error) {
      setMineError(error instanceof Error ? error.message : 'Не удалось загрузить соревнования');
    } finally {
      setMineLoading(false);
    }
  }, [createdChallengeIds]);

  const runAction = useCallback(async (challengeId: string, action: () => Promise<unknown>) => {
    setActingId(challengeId);
    setActionError(null);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не удалось выполнить действие');
      return false;
    } finally {
      setActingId(null);
    }
  }, []);

  const join = useCallback((challengeId: string) => (
    runAction(challengeId, () => joinChallenge(challengeId))
  ), [runAction]);

  const respond = useCallback((challengeId: string, action: ChallengeResponseAction) => (
    runAction(challengeId, () => respondToChallenge(challengeId, action))
  ), [runAction]);

  const cancel = useCallback((challengeId: string) => (
    runAction(challengeId, () => cancelChallenge(challengeId))
  ), [runAction]);

  const create = useCallback(async (input: CreateChallengeInput) => {
    setCreating(true);
    setActionError(null);
    try {
      const result = await createChallenge(input);
      setCreatedChallengeIds((current) => new Set(current).add(result.challengeId));
      return { success: true as const, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать соревнование';
      setActionError(message);
      return { success: false as const, error: message };
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    publicChallenges,
    myChallenges,
    catalogLoading,
    mineLoading,
    catalogError,
    mineError,
    actionError,
    actingId,
    creating,
    loadPublic,
    loadMine,
    join,
    respond,
    cancel,
    create,
    clearActionError: () => setActionError(null),
  };
}
