import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
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
  accent: string;
}> = [
  {
    code: 'fitness',
    title: '30-дневная физподготовка',
    description: 'Ежедневные тренировки для силы и выносливости',
    longDescription:
      'Базовая программа для тела: силовые упражнения, кардио, растяжка и восстановление. Подходит, чтобы втянуться в регулярные тренировки без сложного инвентаря.',
    result: 'Сильнее тело, больше энергии и привычка тренироваться',
    difficulty: 'Средняя',
    duration: '10–25 мин/день',
    format: 'Силовые + кардио + растяжка',
    icon: '💪',
    accent: 'from-orange-500/25 to-red-500/10',
  },
  {
    code: 'running',
    title: '30 дней бега',
    description: 'Мягкий вход в бег через интервалы, ходьбу и восстановление',
    longDescription:
      'Программа для новичка: разминка, лёгкие интервалы бег/ходьба, техника, заминка и растяжка. Нагрузка растёт постепенно, чтобы не перегореть и не перегрузиться.',
    result: 'Выносливость, уверенность в беге и регулярное кардио',
    difficulty: 'Лёгкая → средняя',
    duration: '15–35 мин/день',
    format: 'Бег, ходьба, техника, восстановление',
    icon: '🏃',
    accent: 'from-red-500/25 to-orange-500/10',
  },
  {
    code: 'sleep',
    title: '30 дней качественного сна',
    description: 'Режим, вечерние ритуалы и спокойное засыпание',
    longDescription:
      'Программа помогает стабилизировать режим сна: убрать телефон перед сном, добавить дыхание, растяжку, утренний свет и простые вечерние ритуалы.',
    result: 'Лучшее засыпание, стабильный режим и больше восстановления',
    difficulty: 'Лёгкая',
    duration: '5–20 мин/день',
    format: 'Задания + дыхание + растяжка + дневник сна',
    icon: '😴',
    accent: 'from-blue-500/25 to-purple-500/10',
  },
  {
    code: 'reading',
    title: '30 дней чтения',
    description: 'Сформируй привычку читать каждый день без телефона',
    longDescription:
      'Программа не просто заставляет читать. Она учит выбирать книгу, читать сфокусированно, делать заметки, пересказывать идеи и закреплять понимание.',
    result: 'Привычка чтения, концентрация и лучшее запоминание',
    difficulty: 'Лёгкая',
    duration: '10–25 мин/день',
    format: 'Чтение + заметки + пересказ + фокус-сессии',
    icon: '📚',
    accent: 'from-green-500/25 to-emerald-500/10',
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
      <div className="space-y-5 pb-24">
        <div className="px-1">
          <h1 className="text-2xl font-bold mb-1">Программы</h1>
          <p className="text-gray-400 text-sm">
            30-дневные челленджи с видео, заданиями и прогрессом
          </p>
        </div>

        <div className="space-y-4">
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
              <div
                key={template.code}
                className="relative overflow-hidden rounded-2xl bg-surface border border-white/5"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${template.accent}`}
                />

                <div className="relative p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-3xl">{template.icon}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold leading-tight">
                            {template.title}
                          </h3>

                          <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                            {template.description}
                          </p>
                        </div>

                        <ChevronRight
                          size={20}
                          className="text-gray-500 shrink-0 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 leading-relaxed mb-4">
                    {template.longDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
                      <p className="text-gray-500 text-xs mb-1">Сложность</p>
                      <p className="text-white text-sm font-medium">
                        {template.difficulty}
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
                      <p className="text-gray-500 text-xs mb-1">Время</p>
                      <p className="text-white text-sm font-medium">
                        {template.duration}
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/20 border border-white/5 p-3 col-span-2">
                      <p className="text-gray-500 text-xs mb-1">Формат</p>
                      <p className="text-white text-sm font-medium">
                        {template.format}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 mb-4">
                    <p className="text-accent text-xs font-medium mb-1">
                      Результат через 30 дней
                    </p>
                    <p className="text-gray-200 text-sm">
                      {template.result}
                    </p>
                  </div>

                  {isActive && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs">Прогресс</span>
                        <span className="text-white text-xs font-medium">
                          День {currentDay}/30
                        </span>
                      </div>

                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => openProgram(template, userProgram)}
                    disabled={isCompletedRunning}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isCompletedRunning
                        ? 'bg-surface text-green-400 border border-green-400/20 cursor-default active:scale-100'
                        : isActive
                        ? 'bg-surface-light text-white border border-white/10'
                        : 'bg-accent text-white'
                    }`}
                  >
                    {isCompletedRunning
                      ? 'Программа завершена'
                      : isActive
                        ? `Продолжить: день ${currentDay}`
                        : 'Начать программу'}
                    {!isCompletedRunning && <ChevronRight size={18} />}
                  </button>
                </div>
              </div>
            );
          })}
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
