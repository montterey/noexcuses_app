import { useState } from 'react';
import { Flame, Zap, Clock, CheckCircle2, Plus, X, Check, Ban, Snowflake } from 'lucide-react';
import { User, Goal, GoalFrequency } from '../types';

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
  onAddGoal: (goal: { title: string; type: GoalFrequency; time?: string; why?: string }) => Promise<AddGoalResult>;
}

function getRequiredXp(level: number): number {
  return 100 + level * 50;
}

function getStatusLabel(goal: Goal) {
  if (goal.displayStatus === 'done') return 'Выполнено сегодня';
  if (goal.displayStatus === 'skipped') return 'Пропущено сегодня';
  if (goal.displayStatus === 'frozen') return 'Заморожено сегодня';
  return 'Сегодня';
}

const getCreateErrorMessage = (message?: string) => (
  message ? `Не удалось создать цель: ${message}` : 'Не удалось создать цель'
);

export function Dashboard({ user, goals, onGoalDone, onGoalSkip, onGoalFreeze, onAddGoal }: DashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily' as GoalFrequency,
    time: '',
    why: '',
  });

  const dailyGoals = goals.filter((g) => g.frequency === 'daily');
  const todayGoals = dailyGoals.slice(0, 5);
  const completedToday = dailyGoals.filter((g) => g.completedToday).length;
  const completionPercent = dailyGoals.length > 0 ? Math.round((completedToday / dailyGoals.length) * 100) : 0;

  const currentLevelXp = user.xp % getRequiredXp(user.level);
  const xpPercent = (currentLevelXp / getRequiredXp(user.level)) * 100;

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
    <div className="p-4 space-y-5 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-600 flex items-center justify-center text-lg font-bold">
            {user.firstName[0]}
          </div>
          <div>
            <p className="text-sm text-gray-400">С возвращением,</p>
            <h1 className="text-lg font-semibold">{user.firstName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-light rounded-full">
          <Zap size={16} className="text-accent" />
          <span className="text-sm font-medium">{user.xp} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame size={24} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{user.streak}</p>
              <p className="text-xs text-gray-400">дней подряд</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-700 flex items-center justify-center">
              <span className="text-xl font-bold">{user.level}</span>
            </div>
            <div>
              <p className="text-sm font-medium">Уровень</p>
              <p className="text-xs text-gray-400">
                {currentLevelXp}/{getRequiredXp(user.level)} XP
              </p>
            </div>
          </div>
          <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-400 rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-cyan-500/10 border border-cyan-300/20 rounded-2xl">
        <div className="flex items-center gap-2">
          <Snowflake size={18} className="text-cyan-200" />
          <span className="text-sm font-medium text-cyan-50">Заморозки серии</span>
        </div>
        <span className="text-lg font-bold text-cyan-50">{user.streakFreezeCount}</span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Цели на сегодня</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{completionPercent}%</span>
            <div className="w-20 h-2 bg-dark-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {todayGoals.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 border border-white/5 text-center">
            <p className="text-gray-400 mb-2">Нет целей на сегодня.</p>
            <button
              onClick={() => {
                setCreateError('');
                setShowModal(true);
              }}
              className="text-accent font-medium hover:underline"
            >
              Добавьте первую цель →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todayGoals.map((goal) => {
              const canAct = !goal.displayStatus;
              const canFreeze = user.streakFreezeCount > 0 && canAct;

              return (
                <div
                  key={goal.id}
                  className="w-full p-3.5 bg-surface rounded-xl border border-white/5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        goal.displayStatus === 'done'
                          ? 'bg-accent border-accent'
                          : goal.displayStatus === 'skipped'
                            ? 'bg-red-500/20 border-red-400'
                            : goal.displayStatus === 'frozen'
                              ? 'bg-cyan-500/20 border-cyan-300'
                              : 'border-gray-600'
                      }`}
                    >
                      {goal.displayStatus === 'done' && <CheckCircle2 size={16} className="text-white" />}
                      {goal.displayStatus === 'skipped' && <Ban size={14} className="text-red-300" />}
                      {goal.displayStatus === 'frozen' && <Snowflake size={14} className="text-cyan-200" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-medium leading-snug ${goal.completed ? 'text-gray-300' : ''}`}>
                            {goal.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-gray-300">
                              {getStatusLabel(goal)}
                            </span>

                            {goal.time && (
                              <span className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-gray-300 flex items-center gap-1">
                                <Clock size={11} />
                                {goal.time}
                              </span>
                            )}
                          </div>
                        </div>

                        {goal.goalStreak > 0 && (
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

                      {canAct && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <button
                            onClick={() => onGoalDone(goal.id)}
                            className="min-h-9 rounded-lg bg-accent text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <Check size={14} />
                            Выполнить
                          </button>

                          <button
                            onClick={() => onGoalSkip(goal.id)}
                            className="min-h-9 rounded-lg bg-surface-light text-gray-200 text-xs font-medium border border-white/10 flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <Ban size={14} />
                            Пропустить
                          </button>

                          <button
                            onClick={() => onGoalFreeze(goal.id)}
                            disabled={!canFreeze}
                            className="min-h-9 rounded-lg bg-cyan-500/10 text-cyan-200 text-xs font-medium border border-cyan-300/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <Snowflake size={14} />
                            Заморозить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setCreateError('');
          setShowModal(true);
        }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 hover:bg-accent-600 transition-all active:scale-95"
      >
        <Plus size={28} className="text-white" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center px-2 overflow-x-hidden"
          style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
        >
          <div
            className="w-full max-w-[430px] max-w-full box-border bg-dark-400 rounded-t-3xl p-4 overflow-y-auto overflow-x-hidden animate-in slide-in-from-bottom duration-300"
            style={{
              maxHeight: '85dvh',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
              touchAction: 'pan-y',
              overscrollBehaviorX: 'none',
            }}
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

            <div className="space-y-3 overflow-x-hidden">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Название</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setCreateError('');
                    setFormData({ ...formData, title: e.target.value });
                  }}
                  placeholder="Например, Утренняя медитация"
                  className="w-full max-w-full box-border bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <div className="min-w-0">
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

              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Время</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full max-w-full box-border bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Зачем?</label>
                <textarea
                  value={formData.why}
                  onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                  placeholder="Ваша мотивация..."
                  rows={2}
                  className="w-full max-w-full box-border bg-surface border border-white/10 rounded-xl px-3.5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {createError}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim() || creating}
                className="w-full max-w-full box-border py-3.5 bg-accent rounded-xl font-semibold text-white hover:bg-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {creating ? 'Создаем...' : 'Создать цель'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
