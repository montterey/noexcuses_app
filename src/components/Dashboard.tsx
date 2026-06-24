import { useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Snowflake,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';
import {
  AppCard,
  GlowCard,
  PrimaryButton,
  ProgressBar,
  ProgressRing,
  SectionHeader,
  StatCard,
  StatusBadge,
} from './ui/Primitives';

type AddGoalResult = {
  success: boolean;
  error?: string;
};

interface DashboardProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onGoalPostpone: (goalId: string, time: string) => Promise<boolean>;
  onAddGoal: (goal: {
    title: string;
    type: GoalFrequency;
    time?: string;
    why?: string;
  }) => Promise<AddGoalResult>;
}

function getRequiredXp(level: number): number {
  return 100 + level * 50;
}

function getStatus(goal: Goal): {
  label: string;
  tone: 'neutral' | 'red' | 'cyan' | 'green' | 'amber';
} {
  if (goal.displayStatus === 'done') return { label: 'Выполнено', tone: 'green' };
  if (goal.displayStatus === 'skipped') return { label: 'Пропущено', tone: 'amber' };
  if (goal.displayStatus === 'frozen') return { label: 'Заморожено', tone: 'cyan' };
  return { label: 'Сегодня', tone: 'neutral' };
}

const getCreateErrorMessage = (message?: string) => (
  message ? `Не удалось создать цель: ${message}` : 'Не удалось создать цель'
);

export function Dashboard({
  user,
  goals,
  onGoalDone,
  onGoalSkip,
  onGoalFreeze,
  onAddGoal,
}: DashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily' as GoalFrequency,
    time: '',
    why: '',
  });

  const dailyGoals = goals.filter((goal) => goal.frequency === 'daily');
  const todayGoals = dailyGoals.slice(0, 5);
  const completedToday = dailyGoals.filter((goal) => goal.completedToday).length;
  const completionPercent = dailyGoals.length > 0
    ? Math.round((completedToday / dailyGoals.length) * 100)
    : 0;
  const requiredXp = getRequiredXp(user.level);
  const currentLevelXp = user.xp % requiredXp;
  const xpPercent = (currentLevelXp / requiredXp) * 100;

  const openModal = () => {
    setCreateError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || creating) return;

    setCreating(true);
    setCreateError('');

    try {
      const result = await onAddGoal({
        title: formData.title.trim(),
        type: formData.type,
        time: formData.time || undefined,
        why: formData.why.trim() || undefined,
      });

      if (!result.success) {
        setCreateError(getCreateErrorMessage(result.error));
        return;
      }

      setFormData({ title: '', type: 'daily', time: '', why: '' });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      setCreateError(getCreateErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="safe-area-top overflow-x-hidden px-4 pb-28 pt-4">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-red-soft" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent">NoExcuses</p>
          </div>
          <h1 className="display-heading truncate text-[1.625rem] leading-tight text-zinc-100">
            {user.firstName}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-600">Держи темп</p>
        </div>

        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 font-bold text-lg text-red-200">
            {user.firstName[0]}
          </div>
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#070707] bg-accent text-[8px] font-bold text-white">
            {user.level}
          </span>
        </div>
      </header>

      {/* Hero: Level Progress Ring */}
      <section className="mb-6" aria-label="Прогресс уровня">
        <GlowCard className="p-5">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={xpPercent}
              size={80}
              strokeWidth={6}
              label="Уровень"
              sublabel={`${currentLevelXp}/${requiredXp} XP`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-600">До следующего уровня</p>
              <p className="display-heading mt-1 text-2xl leading-tight text-zinc-100">
                {requiredXp - currentLevelXp} <span className="text-base font-normal text-zinc-500">XP</span>
              </p>
              <div className="mt-3">
                <ProgressBar value={xpPercent} />
              </div>
            </div>
          </div>
        </GlowCard>
      </section>

      {/* Stats Grid */}
      <section className="mb-6 grid grid-cols-3 gap-2.5" aria-label="Статистика">
        <StatCard
          label="Всего XP"
          value={user.xp.toLocaleString('ru-RU')}
          icon={<Zap size={15} className="text-accent" />}
          className="!p-3"
        />
        <StatCard
          label="Серия"
          value={user.streak}
          icon={<Flame size={15} className="text-accent" />}
          className="!p-3"
        />
        <StatCard
          label="Сегодня"
          value={`${completionPercent}%`}
          icon={<Target size={15} className="text-zinc-500" />}
          tone="neutral"
          className="!p-3"
        />
      </section>

      {/* Streak Freezes */}
      <section className="mb-7">
        <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.08] to-transparent px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
              <Snowflake size={16} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-100">Заморозки серии</p>
              <p className="text-[10px] text-cyan-400/70">Защищают от пропуска</p>
            </div>
          </div>
          <span className="display-heading text-xl text-cyan-200 mr-1">{user.streakFreezeCount}</span>
        </div>
      </section>

      {/* Goals Section */}
      <section className="mb-6 space-y-3">
        <SectionHeader
          eyebrow="Дисциплина"
          title="Цели на сегодня"
          trailing={
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-zinc-500">
              {completedToday}/{dailyGoals.length}
            </span>
          }
        />

        {todayGoals.length === 0 ? (
          <AppCard className="p-6 text-center">
            <Target size={32} className="mx-auto mb-3 text-zinc-700" />
            <p className="mb-1 font-semibold text-zinc-200">Сегодня пока нет целей</p>
            <p className="mb-4 text-xs text-zinc-600">Добавьте действие, которое нельзя отложить.</p>
            <PrimaryButton onClick={openModal} className="w-full py-2.5 text-sm">
              Добавить цель
            </PrimaryButton>
          </AppCard>
        ) : (
          <div className="space-y-2">
            {todayGoals.map((goal) => {
              const canAct = !goal.displayStatus;
              const canFreeze = user.streakFreezeCount > 0 && canAct;
              const status = getStatus(goal);

              return (
                <AppCard key={goal.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        goal.displayStatus === 'done'
                          ? 'border-green-500/30 bg-green-500/10 text-green-300'
                          : goal.displayStatus === 'skipped'
                            ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                            : goal.displayStatus === 'frozen'
                              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                              : 'border-accent/25 bg-accent/10 text-accent'
                      }`}
                    >
                      {goal.displayStatus === 'done' && <CheckCircle2 size={16} />}
                      {goal.displayStatus === 'skipped' && <Ban size={15} />}
                      {goal.displayStatus === 'frozen' && <Snowflake size={15} />}
                      {!goal.displayStatus && <Target size={15} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-semibold leading-snug text-zinc-100">{goal.title}</p>
                        {goal.goalStreak > 0 && (
                          <span className="flex shrink-0 items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                            <Flame size={10} /> {goal.goalStreak}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        {goal.time && (
                          <StatusBadge>
                            <Clock size={10} className="mr-1" /> {goal.time}
                          </StatusBadge>
                        )}
                      </div>

                      {goal.why && <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{goal.why}</p>}

                      {canAct && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => onGoalDone(goal.id)}
                            className="flex min-h-[38px] items-center justify-center gap-1 rounded-lg bg-accent px-2 text-[11px] font-semibold text-white transition-all active:scale-[0.97]"
                          >
                            <Check size={13} /> Готово
                          </button>
                          <button
                            onClick={() => onGoalSkip(goal.id)}
                            className="flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light px-2 text-[11px] font-semibold text-zinc-400"
                          >
                            <Ban size={13} /> Пропуск
                          </button>
                          <button
                            onClick={() => onGoalFreeze(goal.id)}
                            disabled={!canFreeze}
                            className="flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2 text-[11px] font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Snowflake size={13} /> Заморозить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Motivational Panel */}
      <GlowCard className="border-accent/25 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10">
            <Flame size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-red-300">Правило дня</p>
            <p className="display-heading mt-1 text-lg leading-tight text-zinc-100">
              Не жди мотивации.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              Закрой первый пункт. Последовательность сильнее идеального настроения.
            </p>
          </div>
        </div>
      </GlowCard>

      {/* FAB */}
      <button
        type="button"
        onClick={openModal}
        aria-label="Добавить цель"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-[max(16px,calc((100vw-430px)/2+16px))] z-30 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white shadow-red-soft transition-all hover:bg-accent-600 active:scale-95"
      >
        <Plus size={22} />
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/85 px-2 backdrop-blur-sm"
          style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
        >
          <div
            className="w-full max-w-[430px] overflow-x-hidden overflow-y-auto rounded-t-[14px] border border-b-0 border-white/[0.07] bg-[#0D0D0E] p-4"
            style={{
              maxHeight: '85dvh',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
              touchAction: 'pan-y',
              overscrollBehaviorX: 'none',
            }}
          >
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-[#0D0D0E] pb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent">Новый шаг</p>
                <h2 className="display-heading text-xl text-zinc-100">Создать цель</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface text-zinc-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 overflow-x-hidden">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Название</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => {
                    setCreateError('');
                    setFormData({ ...formData, title: event.target.value });
                  }}
                  placeholder="Например, утренняя медитация"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
              </label>

              <div>
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Тип</span>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
                  {([
                    ['daily', 'Ежедневная'],
                    ['once', 'Разовая'],
                  ] as Array<[GoalFrequency, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: value })}
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                        formData.type === value
                          ? 'bg-accent text-white shadow-red-soft'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Время</span>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(event) => setFormData({ ...formData, time: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Зачем?</span>
                <textarea
                  value={formData.why}
                  onChange={(event) => setFormData({ ...formData, why: event.target.value })}
                  placeholder="Ваша мотивация"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>

              {createError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  {createError}
                </div>
              )}

              <PrimaryButton
                onClick={handleSubmit}
                disabled={!formData.title.trim() || creating}
                className="flex w-full items-center justify-center gap-2"
              >
                <Check size={18} />
                {creating ? 'Создаём...' : 'Создать цель'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
