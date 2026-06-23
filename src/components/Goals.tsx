import { useState } from 'react';
import { Plus, Flame, Clock, X, Check, CheckCircle2, Ban, Snowflake } from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';
import { BrandedHeader, PosterTabs } from './ui/Primitives';

type AddGoalResult = { success: boolean; error?: string };

interface GoalsProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onGoalPostpone: (goalId: string, time: string) => Promise<boolean>;
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => Promise<AddGoalResult>;
}

interface GoalCardProps {
  goal: Goal;
  freezeCount: number;
  onDone: (goalId: string) => void;
  onSkip: (goalId: string) => void;
  onFreeze: (goalId: string) => void;
  onPostpone: (goal: Goal) => void;
}

const getStatusLabel = (goal: Goal) => {
  if (goal.displayStatus === 'done') return goal.frequency === 'once' ? 'Выполнена' : 'Выполнено сегодня';
  if (goal.displayStatus === 'skipped') return 'Пропущено сегодня';
  if (goal.displayStatus === 'frozen') return 'Серия заморожена';
  if (goal.displayStatus === 'overdue') return 'Цель не выполнена';
  return null;
};

const getCreateErrorMessage = (message?: string) => (
  message ? `Не удалось создать цель: ${message}` : 'Не удалось создать цель'
);

function GoalCard({ goal, freezeCount, onDone, onSkip, onFreeze, onPostpone }: GoalCardProps) {
  const statusLabel = getStatusLabel(goal);
  const canAct = !goal.displayStatus;
  const canFreeze = goal.frequency === 'daily' && freezeCount > 0 && canAct;
  const showDailyActions = goal.frequency === 'daily' && canAct;
  const showOnceCompleteActions = goal.frequency === 'once' && canAct;
  const showOncePostponeOnly = goal.frequency === 'once' && goal.isOverdue;

  return (
    <div className="w-full rounded-[18px] border border-white/10 bg-surface p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)] transition-all">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${goal.displayStatus === 'done' ? 'border-accent bg-accent' : goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue' ? 'border-red-400 bg-red-500/20' : goal.displayStatus === 'frozen' ? 'border-cyan-300 bg-cyan-500/20' : 'border-gray-600'}`}>
          {goal.displayStatus === 'done' && <CheckCircle2 size={17} className="text-white" />}
          {(goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue') && <Ban size={15} className="text-red-300" />}
          {goal.displayStatus === 'frozen' && <Snowflake size={15} className="text-cyan-200" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`font-semibold leading-snug ${goal.completed ? 'text-gray-300' : ''}`}>{goal.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-light px-2 py-1 text-[11px] text-gray-300">{goal.frequency === 'daily' ? 'Ежедневная' : 'Разовая'}</span>
                {goal.time && <span className="flex items-center gap-1 rounded-full bg-surface-light px-2 py-1 text-[11px] text-gray-300"><Clock size={11} />{goal.time}</span>}
                {statusLabel && <span className={`rounded-full px-2 py-1 text-[11px] ${goal.displayStatus === 'overdue' ? 'bg-red-500/10 text-red-300' : 'bg-accent/10 text-accent'}`}>{statusLabel}</span>}
              </div>
            </div>
            {goal.frequency === 'daily' && goal.goalStreak > 0 && <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1"><Flame size={12} className="text-orange-400" /><span className="text-xs font-medium text-orange-400">{goal.goalStreak}</span></div>}
          </div>

          {goal.why && <p className="mt-2 text-sm leading-relaxed text-gray-400">{goal.why}</p>}

          {showDailyActions && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => onDone(goal.id)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg bg-accent text-xs font-medium text-white transition-all active:scale-95"><Check size={14} />Выполнить</button>
              <button onClick={() => onSkip(goal.id)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light text-xs font-medium text-gray-200 transition-all active:scale-95"><Ban size={14} />Пропустить</button>
              <button onClick={() => onFreeze(goal.id)} disabled={!canFreeze} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-500/10 text-xs font-medium text-cyan-200 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"><Snowflake size={14} />Заморозить</button>
            </div>
          )}

          {showOnceCompleteActions && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onDone(goal.id)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg bg-accent text-xs font-medium text-white transition-all active:scale-95"><Check size={14} />Выполнить</button>
              <button onClick={() => onPostpone(goal)} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light text-xs font-medium text-gray-200 transition-all active:scale-95"><Clock size={14} />Перенести</button>
            </div>
          )}

          {showOncePostponeOnly && <button onClick={() => onPostpone(goal)} className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light text-xs font-medium text-gray-200 transition-all active:scale-95"><Clock size={14} />Перенести</button>}
        </div>
      </div>
    </div>
  );
}

export function Goals({ user, goals, onGoalDone, onGoalSkip, onGoalFreeze, onGoalPostpone, onAddGoal }: GoalsProps) {
  const [activeTab, setActiveTab] = useState<GoalFrequency>('daily');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [postponeGoal, setPostponeGoal] = useState<Goal | null>(null);
  const [postponeTime, setPostponeTime] = useState('');
  const [formData, setFormData] = useState({ title: '', type: 'daily' as GoalFrequency, time: '', why: '' });

  const filteredGoals = goals.filter((goal) => goal.frequency === activeTab);

  const handleSubmit = async () => {
    if (!formData.title.trim() || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const result = await onAddGoal({ title: formData.title.trim(), type: formData.type, time: formData.time || undefined, why: formData.why.trim() || undefined });
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

  const openPostpone = (goal: Goal) => { setPostponeGoal(goal); setPostponeTime(goal.time || ''); };
  const submitPostpone = async () => {
    if (!postponeGoal || !postponeTime) return;
    const success = await onGoalPostpone(postponeGoal.id, postponeTime);
    if (!success) return;
    setPostponeGoal(null);
    setPostponeTime('');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden p-4 pb-32">
      <BrandedHeader overline="Discipline" title="GOALS" subtitle="Привычки, разовые цели и ежедневный контроль" right={<div className="flex items-center gap-1 rounded-[14px] border border-cyan-300/20 bg-cyan-500/10 px-3 py-2"><Snowflake size={16} className="text-cyan-200" /><span className="text-sm font-semibold text-cyan-100">{user.streakFreezeCount}</span></div>} />
      <PosterTabs value={activeTab} onChange={setActiveTab} className="mb-4" options={[{ value: 'daily', label: 'DAILY' }, { value: 'once', label: 'ONCE' }]} />

      <div className="space-y-3">
        {filteredGoals.map((goal) => <GoalCard key={goal.id} goal={goal} freezeCount={user.streakFreezeCount} onDone={onGoalDone} onSkip={onGoalSkip} onFreeze={onGoalFreeze} onPostpone={openPostpone} />)}
        {filteredGoals.length === 0 && <div className="rounded-[18px] border border-white/10 bg-surface py-12 text-center"><p className="text-gray-400">Нет {activeTab === 'daily' ? 'ежедневных' : 'разовых'} целей</p><button onClick={() => setShowModal(true)} className="mt-2 font-medium text-accent">Добавьте первую цель →</button></div>}
      </div>

      <button onClick={() => { setCreateError(''); setShowModal(true); }} className="fixed bottom-[calc(98px+env(safe-area-inset-bottom))] right-[max(16px,calc((100vw-430px)/2+16px))] flex h-14 w-14 items-center justify-center rounded-[16px] bg-accent shadow-red-soft transition-all hover:bg-accent-600 active:scale-95"><Plus size={28} className="text-white" /></button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/70 px-2" style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
          <div className="box-border w-full max-w-[430px] overflow-x-hidden overflow-y-auto rounded-t-3xl bg-dark-400 p-4" style={{ maxHeight: '85dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
            <div className="sticky top-0 mb-4 flex items-center justify-between bg-dark-400 pb-2"><h2 className="display-heading text-2xl">Новая цель</h2><button onClick={() => setShowModal(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"><X size={18} className="text-gray-400" /></button></div>
            <div className="space-y-3 overflow-x-hidden">
              <label className="block text-xs font-medium text-gray-400">Название<input type="text" value={formData.title} onChange={(event) => { setCreateError(''); setFormData({ ...formData, title: event.target.value }); }} placeholder="Например, Утренняя медитация" className="mt-1.5 box-border w-full max-w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none" autoFocus /></label>
              <div className="grid grid-cols-2 gap-2"><button onClick={() => setFormData({ ...formData, type: 'daily' })} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${formData.type === 'daily' ? 'border-accent bg-accent text-white' : 'border-white/10 bg-surface text-gray-400'}`}>Ежедневная</button><button onClick={() => setFormData({ ...formData, type: 'once' })} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${formData.type === 'once' ? 'border-accent bg-accent text-white' : 'border-white/10 bg-surface text-gray-400'}`}>Разовая</button></div>
              <input type="time" value={formData.time} onChange={(event) => setFormData({ ...formData, time: event.target.value })} className="box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" />
              <textarea value={formData.why} onChange={(event) => setFormData({ ...formData, why: event.target.value })} placeholder="Ваша мотивация..." rows={2} className="box-border w-full resize-none rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none" />
              {createError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{createError}</p>}
              <button onClick={handleSubmit} disabled={!formData.title.trim() || creating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Check size={18} />{creating ? 'Создаем...' : 'Создать цель'}</button>
            </div>
          </div>
        </div>
      )}

      {postponeGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/70 px-2" style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}>
          <div className="box-border w-full max-w-[430px] overflow-x-hidden rounded-t-3xl bg-dark-400 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <div className="mb-4 flex items-center justify-between"><h2 className="display-heading text-2xl">Перенести цель</h2><button onClick={() => setPostponeGoal(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"><X size={18} className="text-gray-400" /></button></div>
            <div className="space-y-3"><input type="time" value={postponeTime} onChange={(event) => setPostponeTime(event.target.value)} className="box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" autoFocus /><button onClick={submitPostpone} disabled={!postponeTime} className="box-border w-full rounded-xl bg-accent py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Сохранить</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
