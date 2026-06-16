import { useState } from 'react';
import { Plus, Flame, Clock, X, Check, CheckCircle2, Ban, Snowflake } from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';

interface GoalsProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onGoalPostpone: (goalId: string, time: string) => void;
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => void;
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
  if (goal.displayStatus === 'done') {
    return goal.frequency === 'once' ? 'Выполнена' : 'Выполнено сегодня';
  }
  if (goal.displayStatus === 'skipped') return 'Пропущено сегодня';
  if (goal.displayStatus === 'frozen') return 'Серия заморожена';
  if (goal.displayStatus === 'overdue') return 'Цель не выполнена';
  return null;
};

function GoalCard({ goal, freezeCount, onDone, onSkip, onFreeze, onPostpone }: GoalCardProps) {
  const statusLabel = getStatusLabel(goal);
  const canAct = !goal.displayStatus;
  const canFreeze = goal.frequency === 'daily' && freezeCount > 0 && canAct;
  const showDailyActions = goal.frequency === 'daily' && canAct;
  const showOnceCompleteActions = goal.frequency === 'once' && canAct;
  const showOncePostponeOnly = goal.frequency === 'once' && goal.isOverdue;

  return (
    <div className="w-full p-3.5 bg-surface rounded-xl border border-white/5 transition-all">
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            goal.displayStatus === 'done'
              ? 'bg-accent border-accent'
              : goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue'
                ? 'bg-red-500/20 border-red-400'
                : goal.displayStatus === 'frozen'
                  ? 'bg-cyan-500/20 border-cyan-300'
                  : 'border-gray-600'
          }`}
        >
          {goal.displayStatus === 'done' && <CheckCircle2 size={17} className="text-white" />}
          {(goal.displayStatus === 'skipped' || goal.displayStatus === 'overdue') && (
            <Ban size={15} className="text-red-300" />
          )}
          {goal.displayStatus === 'frozen' && <Snowflake size={15} className="text-cyan-200" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`font-semibold leading-snug ${goal.completed ? 'text-gray-300' : ''}`}>
                {goal.title}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-gray-300">
                  {goal.frequency === 'daily' ? 'Ежедневная' : 'Разовая'}
                </span>

                {goal.time && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-gray-300 flex items-center gap-1">
                    <Clock size={11} />
                    {goal.time}
                  </span>
                )}

                {statusLabel && (
                  <span className={`text-[11px] px-2 py-1 rounded-full ${
                    goal.displayStatus === 'overdue'
                      ? 'bg-red-500/10 text-red-300'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {statusLabel}
                  </span>
                )}
              </div>
            </div>

            {goal.frequency === 'daily' && goal.goalStreak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full shrink-0">
                <Flame size={12} className="text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">{goal.goalStreak}</span>
              </div>
            )}
          </div>

          {goal.why && (
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              {goal.why}
            </p>
          )}

          {showDailyActions && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => onDone(goal.id)}
                className="min-h-9 rounded-lg bg-accent text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Check size={14} />
                Выполнить
              </button>

              <button
                onClick={() => onSkip(goal.id)}
                className="min-h-9 rounded-lg bg-surface-light text-gray-200 text-xs font-medium border border-white/10 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Ban size={14} />
                Пропустить
              </button>

              <button
                onClick={() => onFreeze(goal.id)}
                disabled={!canFreeze}
                className="min-h-9 rounded-lg bg-cyan-500/10 text-cyan-200 text-xs font-medium border border-cyan-300/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Snowflake size={14} />
                Заморозить
              </button>
            </div>
          )}

          {showOnceCompleteActions && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => onDone(goal.id)}
                className="min-h-9 rounded-lg bg-accent text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Check size={14} />
                Выполнить
              </button>

              <button
                onClick={() => onPostpone(goal)}
                className="min-h-9 rounded-lg bg-surface-light text-gray-200 text-xs font-medium border border-white/10 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Clock size={14} />
                Перенести
              </button>
            </div>
          )}

          {showOncePostponeOnly && (
            <button
              onClick={() => onPostpone(goal)}
              className="w-full min-h-9 rounded-lg bg-surface-light text-gray-200 text-xs font-medium border border-white/10 flex items-center justify-center gap-1 mt-3 active:scale-95 transition-all"
            >
              <Clock size={14} />
              Перенести
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Goals({ user, goals, onGoalDone, onGoalSkip, onGoalFreeze, onGoalPostpone, onAddGoal }: GoalsProps) {
  const [activeTab, setActiveTab] = useState<GoalFrequency>('daily');
  const [showModal, setShowModal] = useState(false);
  const [postponeGoal, setPostponeGoal] = useState<Goal | null>(null);
  const [postponeTime, setPostponeTime] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily' as GoalFrequency,
    time: '',
    why: '',
  });

  const filteredGoals = goals.filter((g) => g.frequency === activeTab);

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    onAddGoal({
      title: formData.title.trim(),
      type: formData.type,
      time: formData.time || undefined,
      why: formData.why.trim() || undefined,
    });
    setFormData({ title: '', type: 'daily', time: '', why: '' });
    setShowModal(false);
  };

  const openPostpone = (goal: Goal) => {
    setPostponeGoal(goal);
    setPostponeTime(goal.time || '');
  };

  const submitPostpone = () => {
    if (!postponeGoal || !postponeTime) return;
    onGoalPostpone(postponeGoal.id, postponeTime);
    setPostponeGoal(null);
    setPostponeTime('');
  };

  return (
    <div className="p-4 relative min-h-screen pb-24">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Цели</h1>
            <p className="text-gray-400 text-sm">Отслеживайте привычки и разовые цели</p>
          </div>

          <div className="flex items-center gap-1 px-3 py-2 bg-cyan-500/10 border border-cyan-300/20 rounded-xl">
            <Snowflake size={16} className="text-cyan-200" />
            <span className="text-sm font-semibold text-cyan-100">{user.streakFreezeCount}</span>
          </div>
        </div>
      </div>

      <div className="flex bg-surface rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'daily' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Ежедневные
        </button>
        <button
          onClick={() => setActiveTab('once')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'once' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Разовые
        </button>
      </div>

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
          />
        ))}

        {filteredGoals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">Нет {activeTab === 'daily' ? 'ежедневных' : 'разовых'} целей</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-accent font-medium"
            >
              Добавьте первую цель →
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 hover:bg-accent-600 transition-all active:scale-95"
      >
        <Plus size={28} className="text-white" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center px-2">
          <div
            className="w-full max-w-[430px] bg-dark-400 rounded-t-3xl p-4 overflow-y-auto animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: '85dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-400 pb-2">
              <h2 className="text-lg font-bold">Новая цель</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Название</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например, Утренняя медитация"
                  className="w-full bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Тип</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, type: 'daily' })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                      formData.type === 'daily'
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface border-white/10 text-gray-400'
                    }`}
                  >
                    Ежедневная
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, type: 'once' })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                      formData.type === 'once'
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface border-white/10 text-gray-400'
                    }`}
                  >
                    Разовая
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Время</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Зачем?</label>
                <textarea
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="Ваша мотивация..."
                  rows={2}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim()}
                className="w-full py-3.5 bg-accent rounded-xl font-semibold text-white hover:bg-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Создать цель
              </button>
            </div>
          </div>
        </div>
      )}

      {postponeGoal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center px-2">
          <div
            className="w-full max-w-[430px] bg-dark-400 rounded-t-3xl p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Перенести цель</h2>
              <button
                onClick={() => setPostponeGoal(null)}
                className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="time"
                value={postponeTime}
                onChange={(e) => setPostponeTime(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-accent"
                autoFocus
              />

              <button
                onClick={submitPostpone}
                disabled={!postponeTime}
                className="w-full py-3.5 bg-accent rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
