import { useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
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
  PrimaryButton,
  ProgressBar,
  ProgressRing,
  SectionHeader,
  StatusBadge,
} from './ui/Primitives';

type AddGoalResult = { success: boolean; error?: string };

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

function getRequiredXp(level: number) { return 100 + level * 50; }

function getStatus(goal: Goal): { label: string; tone: 'neutral' | 'red' | 'cyan' | 'green' | 'amber' } {
  if (goal.displayStatus === 'done') return { label: 'Выполнено', tone: 'green' };
  if (goal.displayStatus === 'skipped') return { label: 'Пропущено', tone: 'amber' };
  if (goal.displayStatus === 'frozen') return { label: 'Заморожено', tone: 'cyan' };
  return { label: 'Сегодня', tone: 'neutral' };
}

const getCreateErrorMessage = (m?: string) =>
  m ? `Не удалось создать цель: ${m}` : 'Не удалось создать цель';

const QUICK_ACTIONS = [
  { icon: Dumbbell, label: 'Тренировка' },
  { icon: Target, label: 'Привычка' },
  { icon: Check, label: 'Цель' },
  { icon: Zap, label: 'Фокус' },
] as const;

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

  const openModal = () => { setCreateError(''); setShowModal(true); };

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
      if (!result.success) { setCreateError(getCreateErrorMessage(result.error)); return; }
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
    <div className="safe-area-top overflow-x-hidden pb-28">
      {/* ─── Header bar ─── */}
      <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-4">
        <span className="display-heading text-xl text-zinc-100 tracking-tight">NoExcuses</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-1.5">
            <Flame size={14} className="text-accent" />
            <span className="text-sm font-bold text-zinc-100">{user.streak}</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-accent/30 to-accent/10 text-sm font-bold text-red-200">
            {user.firstName[0]}
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4">
        {/* ─── Level + Total XP row ─── */}
        <section className="grid grid-cols-2 gap-3" aria-label="Уровень и опыт">
          {/* Level card */}
          <div className="rounded-xl border border-accent/20 bg-surface p-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Уровень</p>
            <p className="display-heading mt-1 text-4xl leading-none text-accent">{user.level}</p>
            <div className="mt-2.5">
              <ProgressBar value={xpPercent} />
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-600">
              {currentLevelXp.toLocaleString('ru-RU')}&thinsp;/&thinsp;{requiredXp.toLocaleString('ru-RU')} XP
            </p>
          </div>

          {/* Total XP card — cinematic dark photo bg */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.07]">
            {/* Simulated cinematic photo background */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 85% 30%, rgba(225,45,45,0.22) 0%, transparent 60%),' +
                  'radial-gradient(ellipse at 20% 80%, rgba(120,20,20,0.3) 0%, transparent 50%),' +
                  '#0E0E10',
              }}
            />
            {/* Silhouette accent shape */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-2/3 opacity-15"
              style={{
                background:
                  'linear-gradient(135deg, transparent 40%, rgba(225,45,45,0.5) 100%)',
              }}
            />
            <div className="relative z-10 p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Всего XP</p>
              <p className="display-heading mt-1 text-3xl leading-none text-zinc-100">
                {user.xp.toLocaleString('ru-RU')}
              </p>
              <div className="mt-3 inline-block rounded-md bg-accent px-2 py-0.5">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-white">
                  +{user.xpThisWeek || 0} за неделю
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Streak + Daily Progress row ─── */}
        <section className="grid grid-cols-2 gap-3" aria-label="Серия и прогресс дня">
          {/* Streak card */}
          <div className="rounded-xl border border-white/[0.07] bg-surface p-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Серия</p>
            <div className="mt-2 flex items-end gap-1.5">
              <Flame size={20} className="mb-0.5 shrink-0 text-accent" />
              <p className="display-heading text-4xl leading-none text-zinc-100">{user.streak}</p>
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">дней</p>
            {user.streakFreezeCount > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <Snowflake size={11} className="text-cyan-400" />
                <span className="text-[10px] text-cyan-400">{user.streakFreezeCount} заморозки</span>
              </div>
            )}
          </div>

          {/* Daily Progress card — big ring */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-surface p-3.5">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Прогресс дня</p>
            <ProgressRing value={completionPercent} size={72} strokeWidth={6} />
            <p className="mt-2 text-[10px] text-zinc-600">
              {completedToday}/{dailyGoals.length} целей
            </p>
          </div>
        </section>

        {/* ─── Quick Actions ─── */}
        <section aria-label="Быстрые действия">
          <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Быстрые действия</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={i === 2 ? openModal : undefined}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-surface py-3 transition-colors active:bg-surface-light"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-500">{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Today's Focus — cinematic photo card ─── */}
        <section aria-label="Фокус дня">
          <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-600">Фокус дня</p>
          <div className="relative overflow-hidden rounded-xl border border-white/[0.07]" style={{ minHeight: 120 }}>
            {/* Cinematic background */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 80% 50%, rgba(80,0,0,0.6) 0%, transparent 55%),' +
                  'linear-gradient(90deg, #0D0D0F 50%, #1A0808 100%)',
              }}
            />
            {/* Athletic figure silhouette on right */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2"
              style={{
                background:
                  'linear-gradient(to left, rgba(140,15,15,0.18) 0%, transparent 100%)',
              }}
            />
            <div className="relative z-10 flex h-full items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="display-heading text-xl leading-tight text-zinc-100">
                  Дисциплина<br />без оправданий
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                  Не нужна мотивация. Нужны стандарты.
                </p>
              </div>
              {/* Stylised silhouette placeholder */}
              <div
                className="h-[88px] w-[56px] shrink-0 opacity-30"
                style={{
                  background:
                    'linear-gradient(180deg, #E12D2D 0%, #7F1D1D 60%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                  borderRadius: '28px 28px 0 0',
                }}
              />
            </div>
          </div>
        </section>

        {/* ─── Goals Section ─── */}
        <section className="space-y-3" aria-label="Цели на сегодня">
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

                        {goal.why && (
                          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{goal.why}</p>
                        )}

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
      </div>

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
                  onChange={(e) => { setCreateError(''); setFormData({ ...formData, title: e.target.value }); }}
                  placeholder="Например, утренняя медитация"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                  autoFocus
                />
              </label>

              <div>
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Тип</span>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
                  {([['daily', 'Ежедневная'], ['once', 'Разовая']] as Array<[GoalFrequency, string]>).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: v })}
                      className={`rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                        formData.type === v ? 'bg-accent text-white shadow-red-soft' : 'text-zinc-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Время</span>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">Зачем?</span>
                <textarea
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
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
