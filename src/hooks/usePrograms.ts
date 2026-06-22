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
    challenge_updates?: number;
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
        (data || []).map((program) => {
          const template = PROGRAM_TEMPLATES[
            program.program_code as keyof typeof PROGRAM_TEMPLATES
          ] || {
            title: program.program_code,
            description: '',
            icon: '🎯',
          };

          return {
            id: program.id,
            code: program.program_code as ProgramCode,
            title: template.title,
            description: template.description,
            icon: template.icon,
            totalDays: 30,
            currentDay: program.current_day || 1,
            isActive: program.active,
            completed: Boolean(program.completed),
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

  const completeProgramDay = async (
    programCode: ProgramCode,
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
        programCode,
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

    const program = programs.find((item) => item.id === programId);
    if (!program) return { success: false, error: 'Программа не найдена' };

    try {
      const result = await completeProgramDay(
        program.code,
        program.currentDay,
        program.id
      );
      if (result.success) await fetchPrograms();
      return result;
    } catch (error) {
      console.error('Error completing program day:', error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Не удалось завершить день программы',
      };
    }
  };

  const startNewProgram = async (
    programCode: ProgramCode
  ): Promise<ProgramCompletionResult> => {
    if (!user) return { success: false, error: 'Пользователь не загружен' };

    try {
      const result = await completeProgramDay(programCode, 1);
      if (result.success) await fetchPrograms();
      return result;
    } catch (error) {
      console.error('Error starting program:', error);
      return {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Не удалось завершить первый день программы',
      };
    }
  };

  return {
    programs,
    loading,
    startOrContinueProgram,
    startNewProgram,
    refreshPrograms: fetchPrograms,
  };
}
