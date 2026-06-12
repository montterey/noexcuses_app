import { useState } from 'react';
import { Plus, Flame, Clock, X, Check, CheckCircle2 } from 'lucide-react';
import { Goal } from '../types';

interface GoalsProps {
  goals: Goal[];
  onGoalToggle: (goalId: string) => void;
  onAddGoal: (goal: { title: string; type: 'daily' | 'once'; time?: string; why?: string }) => void;
}

export function Goals({ goals, onGoalToggle, onAddGoal }: GoalsProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'once'>('daily');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'daily' as 'daily' | 'once',
    time: '',
    why: '',
  });

  const filteredGoals = goals.filter((g) => g.type === activeTab);

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
        <h1 className="text-2xl font-bold mb-1">Цели</h1>
        <p className="text-gray-400 text-sm">Отслеживайте привычки и разовые цели</p>
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

      <div className="space-y-2">
        {filteredGoals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onGoalToggle(goal.id)}
            className="w-full flex items-center gap-3 p-4 bg-surface rounded-xl border border-white/5 hover:border-white/10 transition-all active:scale-[0.98]"
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                goal.completedToday
                  ? 'bg-accent border-accent'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {goal.completedToday && <CheckCircle2 size={16} className="text-white" />}
            </div>
            <div className="flex-1 text-left">
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
            {goal.streak > 0 && activeTab === 'daily' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full">
                <Flame size={12} className="text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">{goal.streak}</span>
              </div>
            )}
          </button>
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
