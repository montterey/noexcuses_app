import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, Play, Target } from 'lucide-react';
import { Program, ProgramCode, ProgramCompletionResult, ProgramDayContent, ProgramDayType, ProgramExercise } from '../types';
import { ProgramDetail } from './ProgramDetail';
import { supabase } from '../lib/supabase';
import { AppCard, CircularProgress, HeroCard, PosterTabs, ProgressBar, SectionHeader, StatusBadge } from './ui/Primitives';

interface ProgramsProps {
  programs: Program[];
  onStartProgram: (programId: string) => Promise<ProgramCompletionResult>;
  onStartNewProgram: (code: ProgramCode) => Promise<ProgramCompletionResult>;
}

type ProgramTab = 'mine' | 'explore';

const ALL_PROGRAMS: Array<{
  code: ProgramCode;
  title: string;
  description: string;
  result: string;
  difficulty: string;
  duration: string;
  format: string;
  icon: string;
  accent: string;
}> = [
  { code: 'fitness', title: '30-дневная физподготовка', description: 'Ежедневные тренировки для силы и выносливости', result: 'Сильнее тело, больше энергии и привычка тренироваться', difficulty: 'Средняя', duration: '10–25 мин/день', format: 'Силовые + кардио + растяжка', icon: '💪', accent: 'from-orange-500/25 to-red-500/10' },
  { code: 'running', title: '30 дней бега', description: 'Мягкий вход в бег через интервалы, ходьбу и восстановление', result: 'Выносливость, уверенность в беге и регулярное кардио', difficulty: 'Лёгкая → средняя', duration: '15–35 мин/день', format: 'Бег, ходьба, техника, восстановление', icon: '🏃', accent: 'from-red-500/25 to-orange-500/10' },
  { code: 'sleep', title: '30 дней качественного сна', description: 'Режим, вечерние ритуалы и спокойное засыпание', result: 'Лучшее засыпание, стабильный режим и больше восстановления', difficulty: 'Лёгкая', duration: '5–20 мин/день', format: 'Задания + дыхание + растяжка + дневник сна', icon: '😴', accent: 'from-blue-500/25 to-purple-500/10' },
  { code: 'reading', title: '30 дней чтения', description: 'Сформируй привычку читать каждый день без телефона', result: 'Привычка чтения, концентрация и лучшее запоминание', difficulty: 'Лёгкая', duration: '10–25 мин/день', format: 'Чтение + заметки + пересказ + фокус-сессии', icon: '📚', accent: 'from-green-500/25 to-emerald-500/10' },
];

export function Programs({ programs, onStartProgram, onStartNewProgram }: ProgramsProps) {
  const [activeTab, setActiveTab] = useState<ProgramTab>('explore');
  const [selectedProgram, setSelectedProgram] = useState<{ code: ProgramCode; title: string; programId?: string; currentDay: number } | null>(null);
  const [dayContent, setDayContent] = useState<ProgramDayContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionAlreadySaved, setCompletionAlreadySaved] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const contentRequestId = useRef(0);

  const activePrograms = programs.filter((program) => program.isActive && !program.completed);
  const featuredProgram = (activePrograms[0] ? ALL_PROGRAMS.find((template) => template.code === activePrograms[0].code) : ALL_PROGRAMS.find((template) => template.code === 'running')) ?? ALL_PROGRAMS[0]!;
  const featuredUserProgram = programs.find((program) => program.code === featuredProgram.code);
  const programLookup = useMemo(() => new Map(programs.map((program) => [program.code, program])), [programs]);
  const visiblePrograms = activeTab === 'mine' ? ALL_PROGRAMS.filter((template) => programLookup.has(template.code)) : ALL_PROGRAMS;

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
    return parsed.filter((item): item is ProgramExercise => typeof item === 'object' && item !== null && typeof (item as ProgramExercise).name === 'string' && ['string', 'number'].includes(typeof (item as ProgramExercise).reps));
  };

  const openProgram = async (template: (typeof ALL_PROGRAMS)[number], userProgram?: Program) => {
    if (userProgram?.completed) return;
    const currentDay = userProgram?.currentDay || 1;
    const requestId = contentRequestId.current + 1;
    contentRequestId.current = requestId;

    setSelectedProgram({ code: template.code, title: template.title, programId: userProgram?.id, currentDay });
    setDayContent(null);
    setContentError(null);
    setCompletionError(null);
    setCompletionAlreadySaved(false);
    setContentLoading(true);

    try {
      const { data, error } = await supabase.from('program_content').select('day_number, title, type, exercises').eq('program_code', template.code).eq('day_number', currentDay).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Program content not found');
      if (requestId !== contentRequestId.current) return;
      setDayContent({ day_number: Number(data.day_number), title: String(data.title || `День ${currentDay}`), type: data.type as ProgramDayType, exercises: parseExercises(data.exercises) });
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
      const result = selectedProgram.programId ? await onStartProgram(selectedProgram.programId) : await onStartNewProgram(selectedProgram.code);
      if (!result.success) { setCompletionError(result.error || 'Не удалось завершить день программы'); return; }
      if (result.applied === false) { setCompletionAlreadySaved(true); return; }
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
      <div className="overflow-x-hidden px-4 pb-32 pt-5">
        <header className="mb-4"><p className="poster-overline mb-2">30 Day System</p><h1 className="display-heading text-[38px] leading-none text-white">PROGRAMS</h1></header>
        <PosterTabs value={activeTab} onChange={setActiveTab} className="mb-4" options={[{ value: 'mine', label: 'MY PROGRAMS' }, { value: 'explore', label: 'EXPLORE' }]} />

        <HeroCard overline={featuredUserProgram?.isActive ? `Day ${featuredUserProgram.currentDay}/30` : 'Featured'} title={featuredProgram.title} subtitle={featuredProgram.description} image="/redesign/program-hero.jpg" className="mb-4 min-h-[220px]">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0"><p className="text-xs leading-relaxed text-zinc-400">{featuredProgram.result}</p><button type="button" onClick={() => openProgram(featuredProgram, featuredUserProgram)} disabled={Boolean(featuredUserProgram?.completed)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-xs font-extrabold uppercase text-white shadow-red-soft disabled:cursor-default disabled:opacity-60"><Play size={14} />{featuredUserProgram?.isActive ? 'Continue' : featuredUserProgram?.completed ? 'Completed' : 'Start'}</button></div>
            <CircularProgress value={featuredUserProgram ? Math.min(100, (featuredUserProgram.currentDay / 30) * 100) : 0} label="progress" size={78} />
          </div>
        </HeroCard>

        <section className="mb-5 space-y-3"><SectionHeader eyebrow="Today" title="Today's workout" />{activePrograms.length === 0 ? <AppCard className="p-4"><p className="font-semibold text-zinc-200">Нет активной программы</p><p className="mt-1 text-sm text-zinc-500">Выберите программу ниже и начните первый день.</p></AppCard> : activePrograms.slice(0, 2).map((program) => { const template = ALL_PROGRAMS.find((item) => item.code === program.code); if (!template) return null; return <AppCard key={program.id} className="overflow-hidden p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="poster-overline mb-1">Day {program.currentDay}</p><h2 className="display-heading truncate text-2xl leading-none text-white">{template.title}</h2><p className="mt-1 truncate text-xs text-zinc-500">{template.duration}</p></div><button type="button" onClick={() => openProgram(template, program)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-red-soft" aria-label="Открыть программу"><ChevronRight size={20} /></button></div><ProgressBar value={Math.min(100, (program.currentDay / 30) * 100)} className="mt-4 h-2" /></AppCard>; })}</section>

        <section className="mb-5 space-y-3"><SectionHeader eyebrow="Plan" title="Program overview" /><div className="grid grid-cols-4 gap-2">{['Base', 'Build', 'Push', 'Finish'].map((label, index) => <div key={label} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3 text-center"><p className="display-heading text-xl leading-none text-white">{index + 1}</p><p className="mt-1 truncate text-[9px] font-bold uppercase text-zinc-500">{label}</p></div>)}</div></section>

        <section className="space-y-3">{visiblePrograms.length === 0 ? <AppCard className="p-5 text-center text-sm text-zinc-500">Активных программ пока нет</AppCard> : visiblePrograms.map((template) => { const userProgram = programLookup.get(template.code); const progress = userProgram ? Math.min(100, (userProgram.currentDay / 30) * 100) : 0; const isActive = Boolean(userProgram?.isActive); const isCompletedProgram = Boolean(userProgram?.completed); const currentDay = userProgram?.currentDay || 0; return <article key={template.code} className="cinematic-card relative overflow-hidden rounded-[18px] border border-white/10 p-4"><div className={`absolute inset-0 bg-gradient-to-br ${template.accent}`} /><div className="relative z-10"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex items-center gap-2"><span className="text-xl">{template.icon}</span><StatusBadge tone={isActive ? 'red' : isCompletedProgram ? 'green' : 'neutral'}>{isActive ? `День ${currentDay}` : isCompletedProgram ? 'Завершена' : template.difficulty}</StatusBadge></div><h3 className="display-heading text-[28px] leading-none text-white">{template.title}</h3><p className="mt-1 text-sm leading-relaxed text-zinc-400">{template.description}</p></div><CircularProgress value={progress} size={66} /></div><div className="mb-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 bg-black/25 p-3"><CalendarDays size={15} className="mb-2 text-accent" /><p className="text-xs font-semibold text-zinc-200">{template.duration}</p></div><div className="rounded-xl border border-white/10 bg-black/25 p-3"><Target size={15} className="mb-2 text-accent" /><p className="text-xs font-semibold text-zinc-200">{template.format}</p></div></div>{isActive && <div className="mb-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-zinc-500">Прогресс</span><span className="text-xs font-semibold text-zinc-300">День {currentDay}/30</span></div><ProgressBar value={progress} className="h-2" /></div>}<button onClick={() => openProgram(template, userProgram)} disabled={isCompletedProgram} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all active:scale-95 ${isCompletedProgram ? 'cursor-default border border-green-400/20 bg-surface text-green-400 active:scale-100' : isActive ? 'border border-white/10 bg-white/[0.06] text-white' : 'bg-accent text-white shadow-red-soft'}`}>{isCompletedProgram ? 'Программа завершена' : isActive ? `Продолжить: день ${currentDay}` : 'Начать программу'}{!isCompletedProgram && <ChevronRight size={18} />}</button></div></article>; })}</section>
      </div>

      {selectedProgram && <ProgramDetail programCode={selectedProgram.code} programTitle={selectedProgram.title} currentDay={selectedProgram.currentDay} dayContent={dayContent} contentLoading={contentLoading} contentError={contentError} completionError={completionError} completionAlreadySaved={completionAlreadySaved} isCompleting={isCompleting} onClose={closeProgram} onCompleteDay={handleCompleteDay} />}
    </>
  );
}
