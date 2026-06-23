import { Ban, Flame, Snowflake, Target, Trophy, Zap } from 'lucide-react';
import { User, WeeklyStats } from '../types';
import { AppCard, PageHeader, StatCard, StatusBadge } from './ui/Primitives';

interface StatsProps {
  user: User;
  weeklyStats: WeeklyStats[];
}

export function Stats({ user, weeklyStats }: StatsProps) {
  const maxTotal = Math.max(...weeklyStats.map((stat) => stat.total), 1);
  const weekDone = weeklyStats.reduce((sum, stat) => sum + stat.done, 0);
  const weekSkipped = weeklyStats.reduce((sum, stat) => sum + stat.skipped, 0);
  const weekFrozen = weeklyStats.reduce((sum, stat) => sum + stat.frozen, 0);
  const weekXp = weeklyStats.reduce((sum, stat) => sum + stat.xpEarned, 0);
  const weekTotal = weekDone + weekSkipped + weekFrozen;
  const successRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

  return (
    <div className="safe-area-top px-4 pb-32 pt-4">
      <PageHeader
        eyebrow="Результаты"
        title="Статистика"
        subtitle="Неделя в цифрах: дисциплина, серии и заработанный XP"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          label="XP за неделю"
          value={weekXp.toLocaleString('ru-RU')}
          detail="заработано"
          icon={<Zap size={17} className="text-accent" />}
        />
        <StatCard
          label="Успешность"
          value={`${successRate}%`}
          detail={`${weekDone} выполнено`}
          icon={<Target size={17} className="text-green-400" />}
          tone="green"
        />
      </div>

      <AppCard className="mb-4 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-accent">Активность</p>
            <h2 className="display-heading mt-1 text-lg text-zinc-100">Неделя по задачам</h2>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <StatusBadge tone="red">Done</StatusBadge>
            <StatusBadge tone="amber">Skip</StatusBadge>
            <StatusBadge tone="cyan">Freeze</StatusBadge>
          </div>
        </div>

        <div className="flex h-40 items-end justify-between gap-2">
          {weeklyStats.map((stat) => {
            const height = (stat.total / maxTotal) * 100;
            const doneHeight = stat.total > 0 ? (stat.done / stat.total) * 100 : 0;
            const skippedHeight = stat.total > 0 ? (stat.skipped / stat.total) * 100 : 0;
            const frozenHeight = stat.total > 0 ? (stat.frozen / stat.total) * 100 : 0;

            return (
              <div key={stat.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-28 w-full flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] font-semibold text-zinc-500">{stat.total}</span>
                  <div
                    className={`flex w-full flex-col-reverse overflow-hidden rounded-t-md bg-white/[0.04] ${
                      stat.isToday ? 'ring-1 ring-accent/60 shadow-red-soft' : ''
                    }`}
                    style={{ height: `${height}%`, minHeight: stat.total > 0 ? '10px' : '0' }}
                  >
                    {stat.done > 0 && (
                      <div className="w-full bg-accent" style={{ height: `${doneHeight}%` }} />
                    )}
                    {stat.skipped > 0 && (
                      <div className="w-full bg-amber-400/80" style={{ height: `${skippedHeight}%` }} />
                    )}
                    {stat.frozen > 0 && (
                      <div className="w-full bg-cyan-300/80" style={{ height: `${frozenHeight}%` }} />
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold ${stat.isToday ? 'text-accent' : 'text-zinc-600'}`}>
                  {stat.day}
                </span>
              </div>
            );
          })}
        </div>
      </AppCard>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Текущая серия"
          value={`${user.streak} дн.`}
          detail="держи темп"
          icon={<Flame size={17} className="text-accent" />}
        />
        <StatCard
          label="Лучшая серия"
          value={`${user.longestStreak} дн.`}
          detail="личный рекорд"
          icon={<Trophy size={17} className="text-amber-400" />}
          tone="amber"
        />
        <StatCard
          label="Всего выполнено"
          value={user.totalGoalsCompleted}
          detail="за всё время"
          icon={<Target size={17} className="text-green-400" />}
          tone="green"
        />
        <StatCard
          label="Заморозки"
          value={user.streakFreezeCount}
          detail="доступно"
          icon={<Snowflake size={17} className="text-cyan-300" />}
          tone="cyan"
        />
      </div>

      <AppCard className="grid grid-cols-3 divide-x divide-white/[0.07] overflow-hidden">
        <div className="p-4 text-center">
          <p className="display-heading text-2xl text-red-200">{weekDone}</p>
          <p className="mt-1 text-[10px] uppercase text-zinc-500">Done</p>
        </div>
        <div className="p-4 text-center">
          <Ban size={16} className="mx-auto mb-1 text-amber-300" />
          <p className="display-heading text-xl text-amber-200">{weekSkipped}</p>
          <p className="mt-1 text-[10px] uppercase text-zinc-500">Skip</p>
        </div>
        <div className="p-4 text-center">
          <Snowflake size={16} className="mx-auto mb-1 text-cyan-300" />
          <p className="display-heading text-xl text-cyan-200">{weekFrozen}</p>
          <p className="mt-1 text-[10px] uppercase text-zinc-500">Freeze</p>
        </div>
      </AppCard>
    </div>
  );
}
