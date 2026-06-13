import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Program } from '../types';
import { ProgramDetail } from './ProgramDetail';
import { supabase } from '../lib/supabase';

interface ProgramsProps {
  programs: Program[];
  onStartProgram: (programId: string) => void;
  onStartNewProgram: (code: 'fitness' | 'weight_loss' | 'study') => void;
}

const ALL_PROGRAMS = [
  {
    code: 'fitness' as const,
    title: '30-дневная физподготовка',
    description: 'Ежедневные тренировки для силы и выносливости',
    icon: '🏋️',
  },
  {
    code: 'weight_loss' as const,
    title: '30-дневное похудение',
    description: 'Кардио и правильное питание каждый день',
    icon: '🔥',
  },
  {
    code: 'study' as const,
    title: '30-дневный челлендж учёбы',
    description: 'Учись каждый день и прокачай знания',
    icon: '📚',
  },
];

export function Programs({ programs, onStartProgram, onStartNewProgram }: ProgramsProps) {
  const [selectedProgram, setSelectedProgram] = useState<{
    code: string;
    title: string;
    programId?: string;
    currentDay: number;
  } | null>(null);
  const [dayContent, setDayContent] = useState<any>(null);

  const openProgram = async (template: typeof ALL_PROGRAMS[0], userProgram?: Program) => {
    const currentDay = userProgram?.currentDay || 1;
    setSelectedProgram({
      code: template.code,
      title: template.title,
      programId: userProgram?.id,
      currentDay,
    });

    const { data } = await supabase
      .from('program_content')
      .select('*')
      .eq('program_code', template.code)
      .eq('day_number', currentDay)
      .single();

    if (data) {
      setDayContent({
        ...data,
        exercises: typeof data.exercises === 'string'
          ? JSON.parse(data.exercises)
          : data.exercises,
      });
    }
  };

  const handleCompleteDay = async () => {
    if (!selectedProgram) return;

    if (selectedProgram.programId) {
      await onStartProgram(selectedProgram.programId);
    } else {
      await onStartNewProgram(selectedProgram.code as 'fitness' | 'weight_loss' | 'study');
    }

    setSelectedProgram(null);
    setDayContent(null);
  };

  return (
    <>
      <div className="p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Программы</h1>
          <p className="text-gray-400 text-sm">30-дневные челленджи для преображения</p>
        </div>

        <div className="space-y-4">
          {ALL_PROGRAMS.map((template) => {
            const userProgram = programs.find((p) => p.title === template.title);
            const progress = userProgram ? (userProgram.currentDay / 30) * 100 : 0;
            const isActive = userProgram?.isActive || false;
            const currentDay = userProgram?.currentDay || 0;

            return (
              <div
                key={template.code}
                className="bg-surface rounded-2xl p-5 border border-white/5"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-surface-light flex items-center justify-center text-2xl">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{template.title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{template.description}</p>
                  </div>
                </div>

                {isActive && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Прогресс</span>
                      <span className="text-sm font-medium">День {currentDay}/30</span>
                    </div>
                    <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-accent-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openProgram(template, userProgram)}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    isActive
                      ? 'bg-surface-light text-white'
                      : 'bg-accent text-white'
                  }`}
                >
                  {isActive ? `Продолжить (день ${currentDay})` : 'Начать'}
                  <ChevronRight size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedProgram && (
        <ProgramDetail
          programTitle={selectedProgram.title}
          currentDay={selectedProgram.currentDay}
          dayContent={dayContent}
          onClose={() => { setSelectedProgram(null); setDayContent(null); }}
          onCompleteDay={handleCompleteDay}
        />
      )}
    </>
  );
}
