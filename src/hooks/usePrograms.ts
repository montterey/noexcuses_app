import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Program, ProgramCode, ProgramCompletionResult } from '../types';

const PROGRAM_TEMPLATES = {
  fitness: {
    title: '30-дневная физподготовка',
    description: 'Ежедневные тренировки для силы и выносливости',
    icon: '🏋️',
  },
  running: {
    title: '30 дней бега',
    description: 'От первого километра до 5 км без остановок',
    icon: '🏃',
  },
  sleep: {
    title: '30 дней качественного сна',
    description: 'Режим, ритуалы и глубокий восстанавливающий сон',
    icon: '💤',
  },
  reading: {
    title: '30 дней чтения',
    description: 'Читай каждый день и прочитай книгу за месяц',
    icon: '📖',
  },
};

interface ProgramCompletionApiResponse {
  success: boolean;
  result?: {
    applied?: boolean;
    current_day?: number;
    completed?: boolean;
    xp_awarded?: number;
  };
  error?: string;
}

function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

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
            code: p.program_code as ProgramCode,
            title: template.title,
            description: template.description,
            icon: template.icon,
            totalDays: 30,
            currentDay: p.current_day || 1,
            isActive: p.active,
            completed: Boolean(p.completed),
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

  const completeRunningDay = async (
    expectedDay: number,
    programId?: string
  ): Promise<ProgramCompletionResult> => {
    const initData = getTelegramInitData();

    if (!initData) {
      return { success: false, error: 'Telegram initData is missing' };
    }

    const response = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'completeProgramDay',
        initData,
        programCode: 'running',
        programId,
        expectedDay,
      }),
    });

    const payload = await response.json().catch(() => ({})) as ProgramCompletionApiResponse;

    if (!response.ok || !payload.success || !payload.result) {
      return {
        success: false,
        error: payload.error || 'Не удалось завершить день программы',
      };
    }

    return {
      success: true,
      applied: Boolean(payload.result.applied),
      currentDay: payload.result.current_day,
      completed: Boolean(payload.result.completed),
      xpAwarded: Number(payload.result.xp_awarded || 0),
    };
  };

  const startOrContinueProgram = async (
    programId: string
  ): Promise<ProgramCompletionResult> => {
    if (!user) return { success: false, error: 'Пользователь не загружен' };

    const program = programs.find((p) => p.id === programId);
    if (!program) return { success: false, error: 'Программа не найдена' };

    if (program.code === 'running') {
      try {
        const result = await completeRunningDay(program.currentDay, program.id);
        if (result.success) await fetchPrograms();
        return result;
      } catch (error) {
        console.error('Error completing running day:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Не удалось завершить день программы',
        };
      }
    }

    try {
      const newCurrentDay = program.currentDay + 1;
      const isComplete = newCurrentDay >= 30;

      const { error: programError } = await supabase
        .from('user_programs')
        .update({
          current_day: newCurrentDay,
          active: !isComplete,
          completed: isComplete,
        })
        .eq('id', programId);

      if (programError) throw programError;

      const xpReward = isComplete ? 500 : 25;
      const { error: xpError } = await supabase
        .from('users')
        .update({ xp: user.xp + xpReward })
        .eq('id', user.id);

      if (xpError) throw xpError;

      await fetchPrograms();
      return {
        success: true,
        applied: true,
        currentDay: newCurrentDay,
        completed: isComplete,
        xpAwarded: xpReward,
      };
    } catch (error) {
      console.error('Error updating program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось завершить день программы',
      };
    }
  };

  const startNewProgram = async (
    programCode: ProgramCode
  ): Promise<ProgramCompletionResult> => {
    if (!user) return { success: false, error: 'Пользователь не загружен' };

    if (programCode === 'running') {
      try {
        const result = await completeRunningDay(1);
        if (result.success) await fetchPrograms();
        return result;
      } catch (error) {
        console.error('Error starting running program:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Не удалось завершить день программы',
        };
      }
    }

    try {
      const { error } = await supabase
        .from('user_programs')
        .upsert({
          user_id: user.id,
          program_code: programCode,
          current_day: 1,
          active: true,
          completed: false,
          start_date: new Date().toISOString().split('T')[0],
        }, { onConflict: 'user_id,program_code' });

      if (error) throw error;

      await fetchPrograms();
      return {
        success: true,
        applied: true,
        currentDay: 1,
        completed: false,
        xpAwarded: 0,
      };
    } catch (error) {
      console.error('Error starting program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось запустить программу',
      };
    }
  };

  return { programs, loading, startOrContinueProgram, startNewProgram, refreshPrograms: fetchPrograms };
}
