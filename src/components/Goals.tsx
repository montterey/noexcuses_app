import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Pencil,
  Plus,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';
import { BrandedHeader, PosterTabs } from './ui/Primitives';

type GoalMutationResult = { success: boolean; error?: string };
type GoalForm = { title: string; type: GoalFrequency; time: string; why: string };

interface GoalsProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onGoalPostpone: (goalId: string, time: string) => Promise<boolean>;
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => Promise<GoalMutationResult>;
  onGoalUpdate: (goalId: string, updates: { title: string; time?: string; why?: string }) => Promise<GoalMutationResult>;
  onGoalDelete: (goalId: string) => Promise<GoalMutationResult>;
}

interface GoalCardProps {
  goal: Goal;
  freezeCount: number;
  onDone: (goalId: string) => void;
  onSkip: (goalId: string) => void;
  onFreeze: (goalId: string) => void;
  onPostpone: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

const EMPTY_FORM: GoalForm = { title: '', type: 'daily', time: '', why: '' };

const getStatusLabel = (goal: Goal) => {
  if (goal.displayStatus === 'done') return goal.frequency === 'once' ? 'Выполнена' : 'Выполнено сегодня';
  if (goal.displayStatus === 'skipped') return 'Пропущено сегодня';
  if (goal.displayStatus === 'frozen') return 'Серия заморожена';
  if (goal.displayStatus === 'overdue') return 'Цель не выполнена';
  return null;
};

const mutationErrorMessage = (prefix: string, message?: string) => (
  message ? `${prefix}: ${message}` : prefix
);

function GoalCard({
  goal,
  freezeCount,
  onDone,
  onSkip,
  onFreeze,
  onPostpone,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const statusLabel = getStatusLabel(goal);
  const canAct = !goal.displayStatus;
  const canFreeze = goal.frequency === 'daily' && freezeCount > 0 && canAct;
  const showDailyActions = goal.frequency === 'daily' && canAct;
  const showOnceCompleteActions = goal.frequency === 'once' && canAct;
  const showOncePostponeOnly = goal.frequency === 'once' && goal.isOverdue;

  return (
    <article className="w-full rounded-[18px] border border-white/10 bg-surface p-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${goal.displayStatus === 'done' ? 'border-accent bg-accent' : goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue' ? 'border-red-400 bg-red-500/20' : goal.displayStatus === 'frozen' ? 'border-cyan-300 bg-cyan-500/20' : 'border-gray-600'}`}>
          {goal.displayStatus === 'done' && <CheckCircle2 size={17} className="text-white" />}
          {(goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue') && <Ban size={15} className="text-red-300" />}
          {goal.displayStatus === 'frozen' && <Snowflake size={15} className="text-cyan-200" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`break-words font-semibold leading-snug ${goal.completed ? 'text-gray-300' : 'text-white'}`}>{goal.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-light px-2 py-1 text-[11px] text-gray-300">{goal.frequency === 'daily' ? 'Ежедневная' : 'Разовая'}</span>
                {goal.time && <span className="flex items-center gap-1 rounded-full bg-surface-light px-2 py-1 text-[11px] text-gray-300"><Clock size={11} />{goal.time}</span>}
                {statusLabel && <span className={`rounded-full px-2 py-1 text-[11px] ${goal.displayStatus === 'overdue' ? 'bg-red-500/10 text-red-300' : 'bg-accent/10 text-accent'}`}>{statusLabel}</span>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {goal.frequency === 'daily' && goal.goalStreak > 0 && (
                <div className="mr-1 flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1">
                  <Flame size={12} className="text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">{goal.goalStreak}</span>
                </div>
              )}
              <button type="button" onClick={() => onEdit(goal)} aria-label={`Редактировать ${goal.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 active:scale-95"><Pencil size={14} /></button>
              <button type="button" onClick={() => onDelete(goal)} aria-label={`Удалить ${goal.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/15 bg-red-500/[0.06] text-red-300 active:scale-95"><Trash2 size={14} /></button>
            </div>
          </div>

          {goal.why && <p className="mt-2 break-words text-sm leading-relaxed text-gray-400">{goal.why}</p>}

          {showDailyActions && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => onDone(goal.id)} className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-accent px-1 text-[11px] font-medium text-white active:scale-95"><Check size={14} />Выполнить</button>
              <button type="button" onClick={() => onSkip(goal.id)} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light px-1 text-[11px] font-medium text-gray-200 active:scale-95"><Ban size={14} />Пропустить</button>
              <button type="button" onClick={() => onFreeze(goal.id)} disabled={!canFreeze} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-1 text-[11px] font-medium text-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"><Snowflake size={14} />Заморозить</button>
            </div>
          )}

          {showOnceCompleteActions && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onDone(goal.id)} className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-accent text-xs font-medium text-white active:scale-95"><Check size={14} />Выполнить</button>
              <button type="button" onClick={() => onPostpone(goal)} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light text-xs font-medium text-gray-200 active:scale-95"><Clock size={14} />Перенести</button>
            </div>
          )}

          {showOncePostponeOnly && (
            <button type="button" onClick={() => onPostpone(goal)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-white/10 bg-surface-light text-xs font-medium text-gray-200 active:scale-95"><Clock size={14} />Перенести</button>
          )}
        </div>
      </div>
    </article>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden bg-black/75 px-2 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="box-border w-full max-w-[430px] overflow-x-hidden overflow-y-auto rounded-t-[18px] border border-b-0 border-white/10 bg-[#0d0d0e] p-4" style={{ maxHeight: '88dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {children}
      </div>
    </div>
  );
}

export function Goals({
  user,
  goals,
  onGoalDone,
  onGoalSkip,
  onGoalFreeze,
  onGoalPostpone,
  onAddGoal,
  onGoalUpdate,
  onGoalDelete,
}: GoalsProps) {
  const [activeTab, setActiveTab] = useState<GoalFrequency>('daily');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [postponeGoal, setPostponeGoal] = useState<Goal | null>(null);
  const [postponeTime, setPostponeTime] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [formData, setFormData] = useState<GoalForm>(EMPTY_FORM);
  const [editData, setEditData] = useState({ title: '', time: '', why: '' });

  const filteredGoals = goals.filter((goal) => goal.frequency === activeTab);

  const closeCreate = () => {
    if (creating) return;
    setShowCreateModal(false);
    setCreateError('');
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
        setCreateError(mutationErrorMessage('Не удалось создать цель', result.error));
        return;
      }
      setFormData(EMPTY_FORM);
      setActiveTab(formData.type);
      setShowCreateModal(false);
    } catch (error) {
      setCreateError(mutationErrorMessage('Не удалось создать цель', error instanceof Error ? error.message : undefined));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (goal: Goal) => {
    setMutationError('');
    setEditingGoal(goal);
    setEditData({ title: goal.title, time: goal.time || '', why: goal.why || '' });
  };

  const submitEdit = async () => {
    if (!editingGoal || !editData.title.trim() || mutating) return;
    setMutating(true);
    setMutationError('');
    try {
      const result = await onGoalUpdate(editingGoal.id, {
        title: editData.title.trim(),
        time: editData.time || undefined,
        why: editData.why.trim() || undefined,
      });
      if (!result.success) {
        setMutationError(mutationErrorMessage('Не удалось сохранить цель', result.error));
        return;
      }
      setEditingGoal(null);
    } finally {
      setMutating(false);
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete || mutating) return;
    setMutating(true);
    setMutationError('');
    try {
      const result = await onGoalDelete(goalToDelete.id);
      if (!result.success) {
        setMutationError(mutationErrorMessage('Не удалось удалить цель', result.error));
        return;
      }
      setGoalToDelete(null);
    } finally {
      setMutating(false);
    }
  };

  const openPostpone = (goal: Goal) => {
    setPostponeGoal(goal);
    setPostponeTime(goal.time || '');
  };

  const submitPostpone = async () => {
    if (!postponeGoal || !postponeTime || mutating) return;
    setMutating(true);
    const success = await onGoalPostpone(postponeGoal.id, postponeTime);
    setMutating(false);
    if (!success) return;
    setPostponeGoal(null);
    setPostponeTime('');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden p-4 pb-32">
      <BrandedHeader
        overline="Discipline"
        title="GOALS"
        subtitle="Привычки, разовые цели и ежедневный контроль"
        right={<div className="flex items-center gap-1 rounded-[14px] border border-cyan-300/20 bg-cyan-500/10 px-3 py-2"><Snowflake size={16} className="text-cyan-200" /><span className="text-sm font-semibold text-cyan-100">{user.streakFreezeCount}</span></div>}
      />
      <PosterTabs value={activeTab} onChange={setActiveTab} className="mb-4" options={[{ value: 'daily', label: 'DAILY' }, { value: 'once', label: 'ONCE' }]} />

      <div className="space-y-3">
        {filteredGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            freezeCount={user.streakFreezeCount}
            onDone={onGoalDone}
            onSkip={onGoalSkip}
            onFreeze={onGoalFreeze}
            onPostpone={openPostpone}
            onEdit={openEdit}
            onDelete={(selected) => { setMutationError(''); setGoalToDelete(selected); }}
          />
        ))}
        {filteredGoals.length === 0 && (
          <div className="rounded-[18px] border border-white/10 bg-surface py-12 text-center">
            <p className="text-gray-400">Нет {activeTab === 'daily' ? 'ежедневных' : 'разовых'} целей</p>
            <button type="button" onClick={() => { setFormData({ ...EMPTY_FORM, type: activeTab }); setShowCreateModal(true); }} className="mt-2 font-medium text-accent">Добавьте первую цель →</button>
          </div>
        )}
      </div>

      <button type="button" aria-label="Добавить цель" onClick={() => { setCreateError(''); setFormData({ ...EMPTY_FORM, type: activeTab }); setShowCreateModal(true); }} className="fixed bottom-[calc(98px+env(safe-area-inset-bottom))] right-[max(16px,calc((100vw-430px)/2+16px))] flex h-14 w-14 items-center justify-center rounded-[16px] bg-accent shadow-red-soft active:scale-95"><Plus size={28} className="text-white" /></button>

      {showCreateModal && (
        <ModalShell onClose={closeCreate}>
          <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-[#0d0d0e] pb-2">
            <h2 className="display-heading text-2xl">Новая цель</h2>
            <button type="button" onClick={closeCreate} aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-400">Название<input type="text" maxLength={160} value={formData.title} onChange={(event) => { setCreateError(''); setFormData({ ...formData, title: event.target.value }); }} placeholder="Например, Утренняя медитация" className="mt-1.5 box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none" autoFocus /></label>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setFormData({ ...formData, type: 'daily' })} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${formData.type === 'daily' ? 'border-accent bg-accent text-white' : 'border-white/10 bg-surface text-gray-400'}`}>Ежедневная</button><button type="button" onClick={() => setFormData({ ...formData, type: 'once' })} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${formData.type === 'once' ? 'border-accent bg-accent text-white' : 'border-white/10 bg-surface text-gray-400'}`}>Разовая</button></div>
            <label className="block text-xs font-medium text-gray-400">Время<input type="time" value={formData.time} onChange={(event) => setFormData({ ...formData, time: event.target.value })} className="mt-1.5 box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" /></label>
            <label className="block text-xs font-medium text-gray-400">Мотивация<textarea maxLength={1000} value={formData.why} onChange={(event) => setFormData({ ...formData, why: event.target.value })} placeholder="Почему это важно?" rows={3} className="mt-1.5 box-border w-full resize-none rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none" /></label>
            {createError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{createError}</p>}
            <button type="button" onClick={handleSubmit} disabled={!formData.title.trim() || creating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white disabled:opacity-50"><Check size={18} />{creating ? 'Создаём...' : 'Создать цель'}</button>
          </div>
        </ModalShell>
      )}

      {editingGoal && (
        <ModalShell onClose={() => { if (!mutating) setEditingGoal(null); }}>
          <div className="mb-4 flex items-center justify-between">
            <div><p className="poster-overline mb-1">{editingGoal.frequency === 'daily' ? 'Ежедневная цель' : 'Разовая цель'}</p><h2 className="display-heading text-2xl">Редактировать</h2></div>
            <button type="button" onClick={() => setEditingGoal(null)} disabled={mutating} aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface disabled:opacity-50"><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-400">Название<input type="text" maxLength={160} value={editData.title} onChange={(event) => { setMutationError(''); setEditData({ ...editData, title: event.target.value }); }} className="mt-1.5 box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" autoFocus /></label>
            <label className="block text-xs font-medium text-gray-400">Время<input type="time" value={editData.time} onChange={(event) => setEditData({ ...editData, time: event.target.value })} className="mt-1.5 box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" /></label>
            <label className="block text-xs font-medium text-gray-400">Мотивация<textarea maxLength={1000} value={editData.why} onChange={(event) => setEditData({ ...editData, why: event.target.value })} rows={3} className="mt-1.5 box-border w-full resize-none rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" /></label>
            <p className="text-xs leading-relaxed text-zinc-600">Тип цели не меняется, чтобы сохранить историю выполнения, XP и серию.</p>
            {mutationError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{mutationError}</p>}
            <button type="button" onClick={submitEdit} disabled={!editData.title.trim() || mutating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white disabled:opacity-50"><Check size={18} />{mutating ? 'Сохраняем...' : 'Сохранить'}</button>
          </div>
        </ModalShell>
      )}

      {goalToDelete && (
        <ModalShell onClose={() => { if (!mutating) setGoalToDelete(null); }}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-300"><AlertTriangle size={26} /></div>
            <h2 className="display-heading text-2xl">Удалить цель?</h2>
            <p className="mx-auto mt-2 max-w-[330px] break-words text-sm leading-relaxed text-zinc-400">«{goalToDelete.title}» исчезнет из списка. Уже начисленные XP и история выполнений сохранятся.</p>
            {mutationError && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{mutationError}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGoalToDelete(null)} disabled={mutating} className="rounded-xl border border-white/10 bg-surface py-3 font-semibold text-zinc-300 disabled:opacity-50">Отмена</button>
              <button type="button" onClick={confirmDelete} disabled={mutating} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white disabled:opacity-50"><Trash2 size={17} />{mutating ? 'Удаляем...' : 'Удалить'}</button>
            </div>
          </div>
        </ModalShell>
      )}

      {postponeGoal && (
        <ModalShell onClose={() => { if (!mutating) setPostponeGoal(null); }}>
          <div className="mb-4 flex items-center justify-between"><div><p className="poster-overline mb-1">Разовая цель</p><h2 className="display-heading text-2xl">Перенести</h2></div><button type="button" onClick={() => setPostponeGoal(null)} disabled={mutating} aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"><X size={18} className="text-gray-400" /></button></div>
          <p className="mb-4 break-words text-sm text-zinc-400">{postponeGoal.title}</p>
          <label className="block text-xs font-medium text-gray-400">Новое время<input type="time" value={postponeTime} onChange={(event) => setPostponeTime(event.target.value)} className="mt-1.5 box-border w-full rounded-xl border border-white/10 bg-surface px-3.5 py-3 text-white focus:border-accent focus:outline-none" /></label>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600">После переноса цель получит новые 24 часа для выполнения.</p>
          <button type="button" onClick={submitPostpone} disabled={!postponeTime || mutating} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white disabled:opacity-50"><Clock size={18} />{mutating ? 'Переносим...' : 'Перенести цель'}</button>
        </ModalShell>
      )}
    </div>
  );
}
