import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Program } from '../types';

export function usePrograms() {
  const { user, updateUser, refreshUser } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPrograms(
        (data || []).map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          icon: p.icon || '🎯',
          totalDays: p.total_days,
          currentDay: p.current_day,
          isActive: p.is_active,
        }))
      );
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const startOrContinueProgram = async (programId: string) => {
    if (!user) return;

    const program = programs.find((p) => p.id === programId);
    if (!program) return;

    try {
      const newCurrentDay = program.isActive ? program.currentDay + 1 : 1;
      const isComplete = newCurrentDay >= program.totalDays;

      await supabase
        .from('programs')
        .update({
          current_day: newCurrentDay,
          is_active: !isComplete,
          updated_at: new Date().toISOString(),
        })
        .eq('id', programId);

      // Award XP for completing a day
      await updateUser({ xp: user.xp + 25, xpThisWeek: user.xpThisWeek + 25 });

      if (isComplete) {
        // Program completed - award big XP
        await updateUser({ xp: user.xp + 500, xpThisWeek: user.xpThisWeek + 500 });
      }

      await refreshUser();
      await fetchPrograms();
    } catch (error) {
      console.error('Error updating program:', error);
    }
  };

  return { programs, loading, startOrContinueProgram, refreshPrograms: fetchPrograms };
}
