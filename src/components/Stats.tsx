import { Flame, Trophy, Target, Zap } from 'lucide-react';
import { User, WeeklyStats } from '../types';

interface StatsProps {
  user: User;
  weeklyStats: WeeklyStats[];
}

export function Stats({ user, weeklyStats }: StatsProps) {
  const maxCompleted = Math.max(...weeklyStats.map((s) => s.completed), 1);

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Статистика</h1>
        <p className="text-gray-400 text-sm">Ваш прогресс на этой неделе</p>
      </div>

      <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
        <h3 className="font-medium mb-4">Выполнение за неделю</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyStats.map((stat) => {
            const height = (stat.completed / maxCompleted) * 100;
            const isToday = stat.day === 'Пн';

            return (
              <div key={stat.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-24">
                  <span className="text-xs font-medium mb-1">{stat.completed}</span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-t from-accent to-accent-400'
                        : 'bg-surface-light'
                    }`}
                    style={{ height: `${height}%`, minHeight: stat.completed > 0 ? '8px' : '0' }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'text-accent font-medium' : 'text-gray-500'}`}>
                  {stat.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Flame size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Текущая серия</p>
              <p className="text-xl font-bold">{user.streak} дней</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Trophy size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Лучшая серия</p>
              <p className="text-xl font-bold">{user.longestStreak} дней</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Target size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Всего выполнено</p>
              <p className="text-xl font-bold">{user.totalGoalsCompleted}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Zap size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-gray-400">XP за неделю</p>
              <p className="text-xl font-bold">{user.xpThisWeek}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
