import { useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Clock, Lock, Trophy } from 'lucide-react';
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
import { Flame } from 'lucide-react';
import { ProgressRing, UnderlineTabs } from './ui/Primitives';

interface ProgramsProps {
  programs: Program[];
  onStartProgram: (programId: string) => Promise<ProgramCompletionResult>;
  onStartNewProgram: (code: ProgramCode) => Promise<ProgramCompletionResult>;
}

type ProgramTab = 'mine' | 'explore';

const ALL_PROGRAMS: Array<{
  code: ProgramCode;
  title: string;
  shortTitle: string;
  description: string;
  result: string;
  difficulty: string;
  duration: string;
  format: string;
  weeks: Array<{ label: string; focus: string }>;
  bgFrom: string;
  bgTo: string;
}> = [
  {
    code: 'fitness',
    title: '30-дневная физподготовка',
    shortTitle: 'ФИЗПОДГОТОВКА',
    description: 'Силовые тренировки для тела и выносливости',
    result: 'Сильнее тело, больше энергии',
    difficulty: 'Средняя',
    duration: '10–25 мин/день',
    format: 'Силовые + кардио + растяжка',
    weeks: [
      { label: 'Неделя 1', focus: 'Фундамент' },
      { label: 'Неделя 2', focus: 'Набор темпа' },
      { label: 'Неделя 3', focus: 'Пиковая нагрузка' },
      { label: 'Неделя 4', focus: 'Финальный рывок' },
    ],
    bgFrom: 'rgba(140,15,15,0.55)',
    bgTo: 'rgba(50,5,5,0.9)',
  },
  {
    code: 'running',
    title: '30 дней бега',
    shortTitle: 'БЕГ',
    description: 'Мягкий вход в бег через интервалы и восстановление',
    result: 'Выносливость и уверенность в беге',
    difficulty: 'Лёгкая → средняя',
    duration: '15–35 мин/день',
    format: 'Бег, ходьба, техника',
    weeks: [
      { label: 'Неделя 1', focus: 'Разминка' },
      { label: 'Неделя 2', focus: 'Интервалы' },
      { label: 'Неделя 3', focus: 'Темп' },
      { label: 'Неделя 4', focus: 'Финиш' },
    ],
    bgFrom: 'rgba(100,20,10,0.55)',
    bgTo: 'rgba(30,5,5,0.9)',
  },
  {
    code: 'sleep',
    title: '30 дней качественного сна',
    shortTitle: 'СОН',
    description: 'Режим, ритуалы и спокойное засыпание',
    result: 'Лучшее засыпание, стабильный режим',
    difficulty: 'Лёгкая',
    duration: '5–20 мин/день',
    format: 'Дыхание + растяжка + дневник сна',
    weeks: [
      { label: 'Неделя 1', focus: 'Ритуалы' },
      { label: 'Неделя 2', focus: 'Режим' },
      { label: 'Неделя 3', focus: 'Глубина сна' },
      { label: 'Неделя 4', focus: 'Стабильность' },
    ],
    bgFrom: 'rgba(10,30,70,0.55)',
    bgTo: 'rgba(5,10,30,0.9)',
  },
  {
    code: 'reading',
    title: '30 дней чтения',
    shortTitle: 'ЧТЕНИЕ',
    description: 'Привычка читать каждый день без телефона',
    result: 'Концентрация и привычка к чтению',
    difficulty: 'Лёгкая',
    duration: '10–25 мин/день',
    format: 'Чтение + заметки + пересказ',
    weeks: [
      { label: 'Неделя 1', focus: 'Выбор книги' },
      { label: 'Неделя 2', focus: 'Фокус' },
      { label: 'Неделя 3', focus: 'Заметки' },
      { label: 'Неделя 4', focus: 'Закрепление' },
    ],
    bgFrom: 'rgba(10,50,20,0.55)',
    bgTo: 'rgba(5,20,5,0.9)',
  },
];

function getWeekState(
  weekIndex: number,
  currentDay: number
): 'done' | 'active' | 'locked' {
  const weekEnd = (weekIndex + 1) * 7;
  const weekStart = weekIndex * 7 + 1;
  if (currentDay > weekEnd) return 'done';
  if (currentDay >= weekStart) return 'active';
  return 'locked';
}

export function Programs({
  programs,
  onStartProgram,
  onStartNewProgram,
}: ProgramsProps) {
  const [tab, setTab] = useState<ProgramTab>('mine');
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
    if (!Array.isArray(parsed)) throw new Error('Invalid program exercises');
    return parsed.filter((item): item is ProgramExercise => (
      typeof item === 'object' && item !== null
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
      if (requestId === contentRequestId.current) setContentLoading(false);
    }
  };

  const handleCompleteDay = async () => {
    if (!selectedProgram || !dayContent || contentLoading || contentError || isCompleting) return;

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
      if (result.applied === false) { setCompletionAlreadySaved(true); return; }
      closeProgram();
    } catch (error) {
      console.error('Error completing program day:', error);
      setCompletionError('Не удалось завершить день программы');
    } finally {
      setIsCompleting(false);
    }
  };

  const activePrograms = ALL_PROGRAMS.filter((t) =>
    programs.find((p) => p.code === t.code && p.isActive)
  );
  const heroTemplate = activePrograms[0] ?? null;
  const heroUserProgram = heroTemplate
    ? programs.find((p) => p.code === heroTemplate.code)
    : null;
  const heroProgress = heroUserProgram
    ? Math.min(100, (heroUserProgram.currentDay / 30) * 100)
    : 0;
  const heroCurrentDay = heroUserProgram?.currentDay ?? 0;

  return (
    <>
      <div className="safe-area-top overflow-x-hidden pb-24">
        {/* ─── Header bar ─── */}
        <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-4">
          <span className="display-heading text-xl text-zinc-100 tracking-tight">NoExcuses</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1.5">
              <Flame size={14} className="text-accent" />
              <span className="text-sm font-bold text-zinc-100">{programs.length}</span>
            </div>
          </div>
        </header>

        {/* ─── Title ─── */}
        <div className="px-4 pb-3">
          <h1 className="display-heading text-[2rem] uppercase leading-none tracking-tight text-zinc-100">
            Программы
          </h1>
        </div>

        {/* ─── Underline Tabs ─── */}
        <div className="px-4">
          <UnderlineTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'mine', label: 'Мои программы' },
              { value: 'explore', label: 'Обзор' },
            ]}
          />
        </div>

        <div className="mt-4 space-y-4 px-4">
          {/* ─── Hero active program card ─── */}
          {tab === 'mine' && heroTemplate && heroUserProgram && (
            <button
              type="button"
              onClick={() => openProgram(heroTemplate, heroUserProgram)}
              className="relative w-full overflow-hidden rounded-xl text-left active:scale-[0.99] transition-transform"
              style={{ minHeight: 180 }}
            >
              {/* Cinematic background */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${heroTemplate.bgFrom} 0%, ${heroTemplate.bgTo} 100%)`,
                }}
              />
              {/* Red accent glow top-right */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-40"
                style={{
                  background:
                    'radial-gradient(ellipse at 80% 20%, rgba(225,45,45,0.5) 0%, transparent 60%)',
                }}
              />
              {/* Content */}
              <div className="relative z-10 flex h-full items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-accent">
                    30 дней
                  </p>
                  <h2 className="display-heading mt-1 text-2xl uppercase leading-tight text-zinc-100">
                    {heroTemplate.shortTitle}
                  </h2>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                    {heroTemplate.description}
                  </p>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-500">
                    {heroCurrentDay} / 30 дней
                  </p>
                </div>
                <div className="shrink-0">
                  <ProgressRing value={heroProgress} size={76} strokeWidth={6} />
                </div>
              </div>
            </button>
          )}

          {/* ─── Today's workout shortcut (if active program) ─── */}
          {tab === 'mine' && heroTemplate && heroUserProgram && (
            <div>
              <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                Тренировка сегодня
              </p>
              <button
                type="button"
                onClick={() => openProgram(heroTemplate, heroUserProgram)}
                className="flex w-full items-center gap-3 overflow-hidden rounded-xl border border-white/[0.07] bg-surface p-3.5 text-left active:bg-surface-light transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(140,15,15,0.5) 0%, rgba(30,5,5,0.9) 100%)',
                  }}
                >
                  <Trophy size={22} className="text-accent/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-100">
                    День {heroCurrentDay} — тренировка
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-600">
                    <Clock size={11} />
                    <span>{heroTemplate.duration}</span>
                    <span>·</span>
                    <span>{heroTemplate.format}</span>
                  </div>
                </div>
                <div className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-red-soft">
                  Открыть
                </div>
              </button>
            </div>
          )}

          {/* ─── Week overview (if active program) ─── */}
          {tab === 'mine' && heroTemplate && heroUserProgram && (
            <div>
              <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                Обзор программы
              </p>
              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-surface">
                {heroTemplate.weeks.map((week, i) => {
                  const state = getWeekState(i, heroCurrentDay);
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-4 py-3.5 ${
                        i < heroTemplate.weeks.length - 1 ? 'border-b border-white/[0.06]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                            state === 'done'
                              ? 'border-green-500/40 bg-green-500/15'
                              : state === 'active'
                                ? 'border-accent/40 bg-accent/15'
                                : 'border-white/10 bg-white/[0.03]'
                          }`}
                        >
                          {state === 'done' && <CheckCircle2 size={13} className="text-green-400" />}
                          {state === 'active' && <div className="h-2 w-2 rounded-full bg-accent" />}
                          {state === 'locked' && <Lock size={11} className="text-zinc-700" />}
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-400">{week.label}</span>
                          <span className="ml-2 text-[11px] text-zinc-600">{week.focus}</span>
                        </div>
                      </div>
                      {state === 'done' && (
                        <Check size={14} className="text-green-400" />
                      )}
                      {state === 'active' && (
                        <span className="text-[10px] font-bold text-accent">В процессе</span>
                      )}
                      {state === 'locked' && (
                        <span className="text-[10px] text-zinc-700">Заблокировано</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Empty state for Mine tab ─── */}
          {tab === 'mine' && activePrograms.length === 0 && (
            <div className="py-10 text-center">
              <Trophy size={36} className="mx-auto mb-3 text-zinc-700" />
              <p className="font-semibold text-zinc-300">Нет активных программ</p>
              <p className="mt-1.5 text-sm text-zinc-600">Откройте вкладку «Обзор» и начните программу</p>
            </div>
          )}

          {/* ─── Programs list (Explore tab OR non-active mine) ─── */}
          {(tab === 'explore' || (tab === 'mine' && activePrograms.length === 0)) && (
            <div className="space-y-3">
              {(tab === 'mine' ? [] : ALL_PROGRAMS).map((template) => {
                const userProgram = programs.find((p) => p.code === template.code);
                const progress = userProgram ? Math.min(100, (userProgram.currentDay / 30) * 100) : 0;
                const isActive = Boolean(userProgram?.isActive);
                const isCompletedRunning = template.code === 'running' && Boolean(userProgram?.completed);
                const currentDay = userProgram?.currentDay || 0;

                return (
                  <div
                    key={template.code}
                    className="relative overflow-hidden rounded-xl border border-white/[0.07]"
                    style={{ background: '#121214' }}
                  >
                    {/* Left accent stripe */}
                    <div
                      className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                      style={{
                        background: `linear-gradient(180deg, ${template.bgFrom} 0%, transparent 100%)`,
                        opacity: 0.8,
                      }}
                    />
                    <div className="flex items-center gap-3 p-4 pl-5">
                      {isActive ? (
                        <ProgressRing value={progress} size={56} strokeWidth={4.5} />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-light text-2xl">
                          {template.code === 'fitness' ? '💪'
                            : template.code === 'running' ? '🏃'
                              : template.code === 'sleep' ? '😴'
                                : '📚'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-600">
                          {template.duration}
                        </p>
                        <h3 className="display-heading mt-0.5 text-base uppercase leading-tight text-zinc-100">
                          {template.shortTitle}
                        </h3>
                        <p className="mt-0.5 text-[10px] text-zinc-600 line-clamp-1">{template.description}</p>
                        {isActive && (
                          <p className="mt-1 text-[10px] font-semibold text-accent">
                            День {currentDay}/30 · {Math.round(progress)}%
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => openProgram(template, userProgram)}
                        disabled={isCompletedRunning}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                          isCompletedRunning
                            ? 'border border-green-500/30 text-green-400'
                            : isActive
                              ? 'border border-white/10 bg-surface-light text-zinc-300'
                              : 'bg-accent text-white shadow-red-soft'
                        }`}
                      >
                        {isCompletedRunning ? 'Готово' : isActive ? 'Продолжить' : 'Начать'}
                      </button>

                      <ChevronRight size={16} className="shrink-0 text-zinc-700" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
