import { Flame, Trophy, Target, Zap, Ban, Snowflake } from 'lucide-react';
import { User, WeeklyStats } from '../types';

interface StatsProps {
  user: User;
  weeklyStats: WeeklyStats[];
}

export function Stats({ user, weeklyStats }: StatsProps) {
  const maxTotal = Math.max(...weeklyStats.map((s) => s.total), 1);
  const weekDone = weeklyStats.reduce((sum, stat) => sum + stat.done, 0);
  const weekSkipped = weeklyStats.reduce((sum, stat) => sum + stat.skipped, 0);
  const weekFrozen = weeklyStats.reduce((sum, stat) => sum + stat.frozen, 0);
  const weekXp = weeklyStats.reduce((sum, stat) => sum + stat.xpEarned, 0);

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Статистика</h1>
        <p className="text-gray-400 text-sm">Ваш прогресс на этой неделе</p>
      </div>

      <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Неделя по задачам</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-accent">● Done</span>
            <span className="flex items-center gap-1 text-red-300">● Skip</span>
            <span className="flex items-center gap-1 text-cyan-200">● Freeze</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 h-36">
          {weeklyStats.map((stat) => {
            const height = (stat.total / maxTotal) * 100;
            const doneHeight = stat.total > 0 ? (stat.done / stat.total) * 100 : 0;
            const skippedHeight = stat.total > 0 ? (stat.skipped / stat.total) * 100 : 0;
            const frozenHeight = stat.total > 0 ? (stat.frozen / stat.total) * 100 : 0;

            return (
              <div key={stat.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-28">
                  <span className="text-xs font-medium mb-1">{stat.total}</span>
                  <div
                    className={`w-full rounded-t-lg overflow-hidden bg-surface-light transition-all duration-500 ${
                      stat.isToday ? 'ring-1 ring-accent/60' : ''
                    }`}
                    style={{ height: `${height}%`, minHeight: stat.total > 0 ? '10px' : '0' }}
                  >
                    {stat.frozen > 0 && (
                      <div className="w-full bg-cyan-300/80" style={{ height: `${frozenHeight}%` }} />
                    )}
                    {stat.skipped > 0 && (
                      <div className="w-full bg-red-400/80" style={{ height: `${skippedHeight}%` }} />
                    )}
                    {stat.done > 0 && (
                      <div className="w-full bg-accent" style={{ height: `${doneHeight}%` }} />
                    )}
                  </div>
                </div>
                <span className={`text-xs ${stat.isToday ? 'text-accent font-medium' : 'text-gray-500'}`}>
                  {stat.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
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
              <p className="text-xl font-bold">{weekXp}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
          <p className="text-2xl font-bold text-accent">{weekDone}</p>
          <p className="text-xs text-gray-400 mt-1">Done</p>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
          <Ban size={18} className="text-red-300 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-300">{weekSkipped}</p>
          <p className="text-xs text-gray-400 mt-1">Skip</p>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
          <Snowflake size={18} className="text-cyan-200 mx-auto mb-1" />
          <p className="text-2xl font-bold text-cyan-200">{weekFrozen}</p>
          <p className="text-xs text-gray-400 mt-1">Freeze</p>
        </div>
      </div>
    </div>
  );
}
