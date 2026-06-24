import { useRef, useState } from 'react';
import { ChevronRight, Target, Trophy } from 'lucide-react';
import {
  Program,
  ProgramCode,
  ProgramCompletionResult,
  ProgramDayContent,
  ProgramDayType,
  ProgramExercise,
} from '../types';
import { ProgramDetail } from './ProgramDetail';
import { supabase } from '../lib/supabase';
import { GlowCard, ProgressRing } from './ui/Primitives';

interface ProgramsProps {
  programs: Program[];
  onStartProgram: (programId: string) => Promise<ProgramCompletionResult>;
  onStartNewProgram: (code: ProgramCode) => Promise<ProgramCompletionResult>;
}

const ALL_PROGRAMS: Array<{
  code: ProgramCode;
  title: string;
  description: string;
  longDescription: string;
  result: string;
  difficulty: string;
  duration: string;
  format: string;
  icon: string;
  tone: 'red' | 'cyan' | 'green' | 'amber';
}> = [
  {
    code: 'fitness',
    title: '30-дневная физподготовка',
    description: 'Ежедневные тренировки для силы и выносливости',
    longDescription:
      'Базовая программа для тела: силовые упражнения, кардио, растяжка и восстановление.',
    result: 'Сильнее тело, больше энергии',
    difficulty: 'Средняя',
    duration: '10–25 мин/день',
    format: 'Силовые + кардио + растяжка',
    icon: '💪',
    tone: 'red',
  },
  {
    code: 'running',
    title: '30 дней бега',
    description: 'Мягкий вход в бег через интервалы, ходьбу и восстановление',
    longDescription:
      'Программа для новичка: разминка, лёгкие интервалы бег/ходьба, техника.',
    result: 'Выносливость и уверенность в беге',
    difficulty: 'Лёгкая → средняя',
    duration: '15–35 мин/день',
    format: 'Бег, ходьба, техника',
    icon: '🏃',
    tone: 'red',
  },
  {
    code: 'sleep',
    title: '30 дней качественного сна',
    description: 'Режим, вечерние ритуалы и спокойное засыпание',
    longDescription:
      'Программа помогает стабилизировать режим: дыхание, растяжка, утренний свет.',
    result: 'Лучшее засыпание, стабильный режим',
    difficulty: 'Лёгкая',
    duration: '5–20 мин/день',
    format: 'Задания + дыхание + растяжка',
    icon: '😴',
    tone: 'cyan',
  },
  {
    code: 'reading',
    title: '30 дней чтения',
    description: 'Сформируй привычку читать каждый день',
    longDescription:
      'Программа учит выбирать книгу, читать сфокусированно, делать заметки.',
    result: 'Привычка чтения и концентрация',
    difficulty: 'Лёгкая',
    duration: '10–25 мин/день',
    format: 'Чтение + заметки + пересказ',
    icon: '📚',
    tone: 'green',
  },
];

export function Programs({
  programs,
  onStartProgram,
  onStartNewProgram,
}: ProgramsProps) {
  const [selectedProgram, setSelectedProgram] = useState<{
    code: ProgramCode;
    title: string;
    programId?: string;
    currentDay: number;
  } | null>(null);

  const [dayContent, setDayContent] = useState<ProgramDayContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionAlreadySaved, setCompletionAlreadySaved] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const contentRequestId = useRef(0);

  const closeProgram = () => {
    contentRequestId.current += 1;
    setSelectedProgram(null);
    setDayContent(null);
    setContentLoading(false);
    setContentError(null);
    setCompletionError(null);
    setCompletionAlreadySaved(false);
    setIsCompleting(false);
  };

  const parseExercises = (value: unknown): ProgramExercise[] => {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid program exercises');
    }

    return parsed.filter((item): item is ProgramExercise => (
      typeof item === 'object'
      && item !== null
      && typeof (item as ProgramExercise).name === 'string'
      && ['string', 'number'].includes(typeof (item as ProgramExercise).reps)
    ));
  };

  const openProgram = async (
    template: (typeof ALL_PROGRAMS)[number],
    userProgram?: Program
  ) => {
    if (template.code === 'running' && userProgram?.completed) return;

    const currentDay = userProgram?.currentDay || 1;
    const requestId = contentRequestId.current + 1;
    contentRequestId.current = requestId;

    setSelectedProgram({
      code: template.code,
      title: template.title,
      programId: userProgram?.id,
      currentDay,
    });
    setDayContent(null);
    setContentError(null);
    setCompletionError(null);
    setCompletionAlreadySaved(false);
    setContentLoading(true);

    try {
      const { data, error } = await supabase
        .from('program_content')
        .select('day_number, title, type, exercises')
        .eq('program_code', template.code)
        .eq('day_number', currentDay)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Program content not found');
      if (requestId !== contentRequestId.current) return;

      setDayContent({
        day_number: Number(data.day_number),
        title: String(data.title || `День ${currentDay}`),
        type: data.type as ProgramDayType,
        exercises: parseExercises(data.exercises),
      });
    } catch (error) {
      console.error('Error loading program day content:', error);

      if (requestId === contentRequestId.current) {
        setDayContent(null);
        setContentError('Контент этого дня пока недоступен');
      }
    } finally {
      if (requestId === contentRequestId.current) {
        setContentLoading(false);
      }
    }
  };

  const handleCompleteDay = async () => {
    if (
      !selectedProgram
      || !dayContent
      || contentLoading
      || contentError
      || isCompleting
    ) return;

    setIsCompleting(true);
    setCompletionError(null);

    try {
      const result = selectedProgram.programId
        ? await onStartProgram(selectedProgram.programId)
        : await onStartNewProgram(selectedProgram.code);

      if (!result.success) {
        setCompletionError(result.error || 'Не удалось завершить день программы');
        return;
      }

      if (result.applied === false) {
        setCompletionAlreadySaved(true);
        return;
      }

      closeProgram();
    } catch (error) {
      console.error('Error completing program day:', error);
      setCompletionError('Не удалось завершить день программы');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <div className="safe-area-top overflow-x-hidden px-4 pb-24 pt-4">
        <header className="mb-6">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-red-soft" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent">Трансформация</p>
          </div>
          <h1 className="display-heading text-[1.625rem] leading-tight text-zinc-100">Программы</h1>
          <p className="mt-1 text-xs text-zinc-600">30-дневные челленджи с прогрессом</p>
        </header>

        <div className="mt-6 space-y-4">
          {ALL_PROGRAMS.map((template) => {
            const userProgram = programs.find(
              (program) => program.code === template.code
            );

            const progress = userProgram
              ? Math.min(100, (userProgram.currentDay / 30) * 100)
              : 0;

            const isActive = Boolean(userProgram?.isActive);
            const isCompletedRunning = template.code === 'running'
              && Boolean(userProgram?.completed);
            const currentDay = userProgram?.currentDay || 0;

            return (
              <GlowCard
                key={template.code}
                tone={template.tone}
                className={`overflow-hidden ${
                  isActive ? 'ring-1 ring-accent/30' : ''
                }`}
              >
                <div className="flex items-stretch gap-4 p-4">
                  {/* Progress Ring */}
                  {isActive ? (
                    <ProgressRing
                      value={progress}
                      size={68}
                      strokeWidth={5}
                      tone={template.tone}
                    />
                  ) : (
                    <div className="flex h-[68px] w-[68px shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-light text-2xl">
                      {template.icon}
                    </div>
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-600">
                          {template.duration}
                        </p>
                        <h3 className="display-heading mt-0.5 text-lg leading-tight text-zinc-100">
                          {template.title}
                        </h3>
                      </div>
                      <ChevronRight
                        size={18}
                        className="mt-1 shrink-0 text-zinc-600"
                      />
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Progress bar for active */}
                    {isActive && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-zinc-500">День {currentDay}/30</span>
                          <span className="text-accent">{Math.round(progress)}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={() => openProgram(template, userProgram)}
                      disabled={isCompletedRunning}
                      className={`mt-3 w-full rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                        isCompletedRunning
                          ? 'border border-green-500/30 bg-green-500/10 text-green-300'
                          : isActive
                            ? 'border border-white/10 bg-surface-light text-zinc-200'
                            : 'bg-accent text-white shadow-red-soft'
                      }`}
                    >
                      {isCompletedRunning
                        ? 'Завершено'
                        : isActive
                          ? `Продолжить: день ${currentDay}`
                          : 'Начать программу'}
                    </button>
                  </div>
                </div>

                {/* Result badge */}
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className={`${
                      template.tone === 'red' ? 'text-accent'
                      : template.tone === 'cyan' ? 'text-cyan-400'
                      : template.tone === 'green' ? 'text-green-500'
                      : 'text-amber-400'
                    }`} />
                    <span className="text-[11px] text-zinc-400">{template.result}</span>
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>

        {/* Info card */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-surface-light">
              <Target size={15} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-300">Как это работает</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                Выберите программу, выполняйте задания дня и отмечайте прогресс.
                Программа адаптируется под ваш темп.
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedProgram && (
        <ProgramDetail
          programCode={selectedProgram.code}
          programTitle={selectedProgram.title}
          currentDay={selectedProgram.currentDay}
          dayContent={dayContent}
          contentLoading={contentLoading}
          contentError={contentError}
          completionError={completionError}
          completionAlreadySaved={completionAlreadySaved}
          isCompleting={isCompleting}
          onClose={closeProgram}
          onCompleteDay={handleCompleteDay}
        />
      )}
    </>
  );
}
