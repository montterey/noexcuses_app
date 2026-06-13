import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Achievement } from '../types';

export function useAchievements() {
  const { user } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .order('created_at', { ascending: true });

      if (defError) throw defError;

      const { data: userAchievements, error: uaError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);

      if (uaError) throw uaError;

      const unlockedMap = new Map(
        (userAchievements || []).map((ua) => [ua.achievement_id, ua.unlocked_at])
      );

      setAchievements(
        (definitions || []).map((d) => ({
          id: d.code,
          title: d.title_ru,
          description: d.description_ru || '',
          icon: d.icon || '🏆',
          unlocked: unlockedMap.has(d.code),
          unlockedAt: unlockedMap.get(d.code)?.split('T')[0],
        }))
      );
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { achievements, loading, refreshAchievements: fetchAchievements };
}
