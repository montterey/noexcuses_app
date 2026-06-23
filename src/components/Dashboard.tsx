import { useState } from 'react';
import { Ban, Check, CheckCircle2, Clock, Dumbbell, Flame, Plus, ShieldCheck, Snowflake, Target, Trophy, X } from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';
import { ActionTile, AppCard, BrandedHeader, CircularProgress, HeroCard, MetricCard, PrimaryButton, ProgressBar, SectionHeader, StatusBadge } from './ui/Primitives';

type AddGoalResult = { success: boolean; error?: string };

interface DashboardProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onGoalPostpone: (goalId: string, time: string) => Promise<boolean>;
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => Promise<AddGoalResult>;
}

function getRequiredXp(level: number): number {
  return 100 + level * 50;
}

function getStatus(goal: Goal): { label: string; tone: 'neutral' | 'red' | 'cyan' | 'green' | 'amber' } {
  if (goal.displayStatus === 'done') return { label: 'Выполнено сегодня', tone: 'green' };
  if (goal.displayStatus === 'skipped') return { label: 'Пропущено сегодня', tone: 'amber' };
  if (goal.displayStatus === 'frozen') return { label: 'Заморожено сегодня', tone: 'cyan' };
  return { label: 'Сегодня', tone: 'neutral' };
}

const getCreateErrorMessage = (message?: string) => (
  message ? `Не удалось создать цель: ${message}` : 'Не удалось создать цель'
);

export function Dashboard({ user, goals, onGoalDone, onGoalSkip, onGoalFreeze, onAddGoal }: DashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({ title: '', type: 'daily' as GoalFrequency, time: '', why: '' });

  const dailyGoals = goals.filter((goal) => goal.frequency === 'daily');
  const todayGoals = dailyGoals.slice(0, 5);
  const completedToday = dailyGoals.filter((goal) => goal.completedToday).length;
  const completionPercent = dailyGoals.length > 0 ? Math.round((completedToday / dailyGoals.length) * 100) : 0;
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
    <div className="safe-area-top overflow-x-hidden px-4 pb-32 pt-4">
      <BrandedHeader
        title="NoExcuses"
        subtitle={`${user.firstName}, держи темп`}
        right={(
          <div className="relative flex h-11 w-11 items-center justify-center rounded-[14px] border border-accent/30 bg-accent/10 font-extrabold text-red-100 shadow-red-soft">
            {user.firstName[0]}
            <span className="absolute -right-1 -top-1 rounded-full border border-black bg-accent px-1.5 py-0.5 text-[9px] leading-none text-white">{user.level}</span>
          </div>
        )}
      />

      <section className="mb-5 space-y-3" aria-label="Прогресс пользователя">
        <div className="grid grid-cols-[0.88fr_1.12fr] gap-3">
          <MetricCard label="Level" value={user.level} detail={`${currentLevelXp}/${requiredXp} XP`} icon={<ShieldCheck size={17} className="text-accent" />} />
          <HeroCard overline="Total XP" title={user.xp.toLocaleString('ru-RU')} subtitle={`+${user.xpThisWeek || 0} XP за неделю`} image="/redesign/dashboard-xp.jpg" className="min-h-[158px] p-4">
            <ProgressBar value={xpPercent} className="h-2" />
          </HeroCard>
        </div>

        <div className="grid grid-cols-[1fr_112px] gap-3">
          <MetricCard label="Streak" value={user.streak} detail="дней дисциплины" icon={<Flame size={18} className="text-accent" />} />
          <div className="athletic-panel flex flex-col items-center justify-center rounded-[16px] p-3">
            <CircularProgress value={completionPercent} label="today" size={88} />
            <p className="mt-2 text-center text-[10px] font-bold uppercase text-zinc-500">{completedToday}/{dailyGoals.length} целей</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ActionTile icon={<Plus size={18} className="text-accent" />} label="Goal" onClick={openModal} />
          <ActionTile icon={<Trophy size={18} className="text-accent" />} label="Win" />
          <ActionTile icon={<Dumbbell size={18} className="text-accent" />} label="Train" />
        </div>

        <div className="flex items-center justify-between rounded-[16px] border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Snowflake size={18} className="text-cyan-300" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-100">Заморозки серии</p>
              <p className="truncate text-[10px] text-cyan-300/60">Защита пропущенного дня</p>
            </div>
          </div>
          <span className="display-heading text-2xl text-cyan-200">{user.streakFreezeCount}</span>
        </div>
      </section>

      <section className="mb-5 space-y-3">
        <SectionHeader eyebrow="Discipline" title="Цели на сегодня" trailing={<span className="text-xs font-semibold text-zinc-500">{completedToday}/{dailyGoals.length}</span>} />
        <ProgressBar value={completionPercent} />

        {todayGoals.length === 0 ? (
          <AppCard className="p-6 text-center">
            <Target size={28} className="mx-auto mb-3 text-zinc-700" />
            <p className="mb-1 font-semibold text-zinc-200">Сегодня пока нет целей</p>
            <p className="mb-4 text-xs text-zinc-500">Добавьте одно действие, которое нельзя отложить.</p>
            <PrimaryButton onClick={openModal} className="w-full py-2.5 text-sm">Добавить цель</PrimaryButton>
          </AppCard>
        ) : (
          <div className="space-y-2.5">
            {todayGoals.map((goal) => {
              const canAct = !goal.displayStatus;
              const canFreeze = user.streakFreezeCount > 0 && canAct;
              const status = getStatus(goal);

              return (
                <AppCard key={goal.id} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border ${goal.displayStatus === 'done' ? 'border-green-500/30 bg-green-500/10 text-green-300' : goal.displayStatus === 'skipped' ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : goal.displayStatus === 'frozen' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-zinc-600'}`}>
                      {goal.displayStatus === 'done' && <CheckCircle2 size={16} />}
                      {goal.displayStatus === 'skipped' && <Ban size={15} />}
                      {goal.displayStatus === 'frozen' && <Snowflake size={15} />}
                      {!goal.displayStatus && <Target size={15} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-semibold leading-snug text-zinc-100">{goal.title}</p>
                        {goal.goalStreak > 0 && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-300"><Flame size={12} /> {goal.goalStreak}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        {goal.time && <StatusBadge><Clock size={10} className="mr-1" /> {goal.time}</StatusBadge>}
                      </div>
                      {goal.why && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{goal.why}</p>}

                      {canAct && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          <button onClick={() => onGoalDone(goal.id)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg bg-accent px-1 text-[10px] font-semibold text-white transition-colors active:bg-accent-600"><Check size={13} /> Выполнить</button>
                          <button onClick={() => onGoalSkip(goal.id)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light px-1 text-[10px] font-semibold text-zinc-300"><Ban size={13} /> Пропустить</button>
                          <button onClick={() => onGoalFreeze(goal.id)} disabled={!canFreeze} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-1 text-[10px] font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"><Snowflake size={13} /> Заморозить</button>
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

      <HeroCard overline="Focus" title="Не жди мотивации" subtitle="Закрой первый пункт. Последовательность сильнее идеального настроения." image="/redesign/focus-card.jpg" className="min-h-[172px]" />

      <button type="button" onClick={openModal} aria-label="Добавить цель" className="fixed bottom-[calc(98px+env(safe-area-inset-bottom))] right-[max(16px,calc((100vw-430px)/2+16px))] z-30 flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-white shadow-red-soft transition-colors hover:bg-accent-600 active:bg-accent-600">
        <Plus size={23} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/80 px-2 backdrop-blur-sm" style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
          <div className="w-full max-w-[430px] overflow-x-hidden overflow-y-auto rounded-t-[18px] border border-b-0 border-white/[0.07] bg-[#0D0D0E] p-4" style={{ maxHeight: '85dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-[#0D0D0E] pb-2">
              <div>
                <p className="poster-overline">Новый шаг</p>
                <h2 className="display-heading text-2xl text-zinc-100">Создать цель</h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface text-zinc-400"><X size={18} /></button>
            </div>

            <div className="space-y-3 overflow-x-hidden">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Название</span>
                <input type="text" value={formData.title} onChange={(event) => { setCreateError(''); setFormData({ ...formData, title: event.target.value }); }} placeholder="Например, утренняя медитация" className="w-full max-w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none" autoFocus />
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Тип</span>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-1">
                  {([['daily', 'Ежедневная'], ['once', 'Разовая']] as Array<[GoalFrequency, string]>).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setFormData({ ...formData, type: value })} className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${formData.type === value ? 'bg-accent text-white' : 'text-zinc-500'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Время</span>
                <input type="time" value={formData.time} onChange={(event) => setFormData({ ...formData, time: event.target.value })} className="w-full max-w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-zinc-100 focus:border-accent focus:outline-none" />
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Зачем?</span>
                <textarea value={formData.why} onChange={(event) => setFormData({ ...formData, why: event.target.value })} placeholder="Ваша мотивация" rows={2} className="w-full max-w-full resize-none rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none" />
              </label>
              {createError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{createError}</p>}
              <PrimaryButton onClick={handleSubmit} disabled={!formData.title.trim() || creating} className="flex w-full items-center justify-center gap-2"><Check size={18} />{creating ? 'Создаём...' : 'Создать цель'}</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
