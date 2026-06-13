import { useState } from 'react';
import { Flame, Zap, Clock, CheckCircle2, Plus, X, Check } from 'lucide-react';
import { User, Goal } from '../types';

interface DashboardProps {
  user: User;
  goals: Goal[];
  onGoalToggle: (goalId: string) => void;
  onAddGoal: (goal: { title: string; type: 'daily' | 'once'; time?: string; why?: string }) => void;
}

function getRequiredXp(level: number): number {
  return 100 + level * 50;
}

export function Dashboard({ user, goals, onGoalToggle, onAddGoal }: DashboardProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily' as 'daily' | 'once',
    time: '',
    why: '',
  });

  const dailyGoals = goals.filter((g) => g.type === 'daily');
  const todayGoals = dailyGoals.slice(0, 5);
  const completedToday = todayGoals.filter((g) => g.completedToday).length;
  const completionPercent = todayGoals.length > 0 ? Math.round((completedToday / todayGoals.length) * 100) : 0;

  const currentLevelXp = user.xp % getRequiredXp(user.level);
  const xpPercent = (currentLevelXp / getRequiredXp(user.level)) * 100;

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
    <div className="p-4 space-y-5">
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
              onClick={() => setShowModal(true)}
              className="text-accent font-medium hover:underline"
            >
              Добавьте первую цель →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => onGoalToggle(goal.id)}
                className="w-full flex items-center gap-3 p-4 bg-surface rounded-xl border border-white/5 hover:border-white/10 transition-all active:scale-[0.98] touch-manipulation"
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all pointer-events-none ${
                    goal.completedToday
                      ? 'bg-accent border-accent'
                      : 'border-gray-600'
                  }`}
                >
                  {goal.completedToday && <CheckCircle2 size={16} className="text-white pointer-events-none" />}
                </div>
                <div className="flex-1 text-left pointer-events-none">
                  <p className={`font-medium ${goal.completedToday ? 'text-gray-500 line-through' : ''}`}>
                    {goal.title}
                  </p>
                  {goal.time && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={12} className="text-gray-500" />
                      <span className="text-xs text-gray-500">{goal.time}</span>
                    </div>
                  )}
                </div>
                {goal.streak > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full pointer-events-none">
                    <Flame size={12} className="text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">{goal.streak}</span>
                  </div>
                )}
              </button>
            ))}
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
