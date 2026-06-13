import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Program } from '../types';

const PROGRAM_TEMPLATES = {
  fitness: {
    title: '30-дневная физподготовка',
    description: 'Ежедневные тренировки для силы и выносливости',
    icon: '🏋️',
  },
  weight_loss: {
    title: '30-дневное похудение',
    description: 'Кардио и правильное питание каждый день',
    icon: '🔥',
  },
  study: {
    title: '30-дневный челлендж учёбы',
    description: 'Учись каждый день и прокачай знания',
    icon: '📚',
  },
};

export function usePrograms() {
  const { user } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPrograms(
        (data || []).map((p) => {
          const template = PROGRAM_TEMPLATES[p.program_code as keyof typeof PROGRAM_TEMPLATES] || {
            title: p.program_code,
            description: '',
            icon: '🎯',
          };
          return {
            id: p.id,
            title: template.title,
            description: template.description,
            icon: template.icon,
            totalDays: 30,
            currentDay: p.current_day || 1,
            isActive: p.active,
          };
        })
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
      const newCurrentDay = program.currentDay + 1;
      const isComplete = newCurrentDay >= 30;

      await supabase
        .from('user_programs')
        .update({
          current_day: newCurrentDay,
          active: !isComplete,
          completed: isComplete,
        })
        .eq('id', programId);

      // Начисляем XP
      const xpReward = isComplete ? 500 : 25;
      await supabase
        .from('users')
        .update({ xp: user.xp + xpReward })
        .eq('id', user.id);

      await fetchPrograms();
    } catch (error) {
      console.error('Error updating program:', error);
    }
  };

  const startNewProgram = async (programCode: 'fitness' | 'weight_loss' | 'study') => {
    if (!user) return;

    try {
      await supabase
  .from('user_programs')
  .upsert({
    user_id: user.id,
    program_code: programCode,
    current_day: 1,
    active: true,
    completed: false,
    start_date: new Date().toISOString().split('T')[0],
  }, { onConflict: 'user_id,program_code' });

      await fetchPrograms();
    } catch (error) {
      console.error('Error starting program:', error);
    }
  };

  return { programs, loading, startOrContinueProgram, startNewProgram, refreshPrograms: fetchPrograms };
}
