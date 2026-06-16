import { useState } from 'react';
import { Plus, Flame, Clock, X, Check, CheckCircle2, Ban, Snowflake } from 'lucide-react';
import { Goal, GoalFrequency, User } from '../types';

interface GoalsProps {
  user: User;
  goals: Goal[];
  onGoalDone: (goalId: string) => void;
  onGoalSkip: (goalId: string) => void;
  onGoalFreeze: (goalId: string) => void;
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => void;
}

interface GoalCardProps {
  goal: Goal;
  freezeCount: number;
  onDone: (goalId: string) => void;
  onSkip: (goalId: string) => void;
  onFreeze: (goalId: string) => void;
}

const STATUS_LABELS = {
  done: 'Выполнено сегодня',
  skipped: 'Пропущено сегодня',
  frozen: 'Серия заморожена',
};

function GoalCard({ goal, freezeCount, onDone, onSkip, onFreeze }: GoalCardProps) {
  const hasTodayStatus = Boolean(goal.todayStatus);
  const canFreeze = goal.frequency === 'daily' && freezeCount > 0 && !hasTodayStatus;

  return (
    <div className="w-full p-4 bg-surface rounded-xl border border-white/5 transition-all">
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            goal.completedToday
              ? 'bg-accent border-accent'
              : goal.skippedToday
                ? 'bg-red-500/20 border-red-400'
                : goal.frozenToday
                  ? 'bg-cyan-500/20 border-cyan-300'
                  : 'border-gray-600'
          }`}
        >
          {goal.completedToday && <CheckCircle2 size={17} className="text-white" />}
          {goal.skippedToday && <Ban size={15} className="text-red-300" />}
          {goal.frozenToday && <Snowflake size={15} className="text-cyan-200" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`font-semibold leading-snug ${goal.completedToday ? 'text-gray-500 line-through' : ''}`}>
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

                {goal.todayStatus && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-accent/10 text-accent">
                    {STATUS_LABELS[goal.todayStatus]}
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
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              {goal.why}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => onDone(goal.id)}
              disabled={hasTodayStatus}
              className="min-h-10 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Check size={15} />
              Done
            </button>

            <button
              onClick={() => onSkip(goal.id)}
              disabled={hasTodayStatus}
              className="min-h-10 rounded-lg bg-surface-light text-gray-200 text-sm font-medium border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Ban size={15} />
              Skip
            </button>

            <button
              onClick={() => onFreeze(goal.id)}
              disabled={!canFreeze}
              className="min-h-10 rounded-lg bg-cyan-500/10 text-cyan-200 text-sm font-medium border border-cyan-300/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Snowflake size={15} />
              Freeze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Goals({ user, goals, onGoalDone, onGoalSkip, onGoalFreeze, onAddGoal }: GoalsProps) {
  const [activeTab, setActiveTab] = useState<GoalFrequency>('daily');
  const [showModal, setShowModal] = useState(false);
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="w-full max-w-[430px] bg-dark-400 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Новая цель</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-full bg-surface flex items-center justify-center"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Название</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например, Утренняя медитация"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Тип</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, type: 'daily' })}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all border ${
                      formData.type === 'daily'
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface border-white/10 text-gray-400'
                    }`}
                  >
                    Ежедневная
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, type: 'once' })}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all border ${
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
                <label className="block text-sm font-medium text-gray-400 mb-2">Время (опционально)</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Зачем? (опционально)</label>
                <textarea
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="Ваша мотивация..."
                  rows={2}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim()}
                className="w-full py-4 bg-accent rounded-xl font-semibold text-white hover:bg-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Создать цель
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
