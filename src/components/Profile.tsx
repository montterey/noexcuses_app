import { useState } from 'react';
import { Bell, Globe, Settings, Snowflake, X } from 'lucide-react';
import { Achievement, User } from '../types';
import { AppCard, BrandedHeader, PosterTabs, ProgressBar, StatCard, StatusBadge } from './ui/Primitives';

interface ProfileProps {
  user: User;
  achievements: Achievement[];
}

function getRequiredXp(level: number): number {
  return 100 + level * 50;
}

export function Profile({ user, achievements }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'achievements'>('profile');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const requiredXp = getRequiredXp(user.level);
  const currentLevelXp = user.xp % requiredXp;
  const xpPercent = (currentLevelXp / requiredXp) * 100;
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div className="safe-area-top px-4 pb-32 pt-4">
      <BrandedHeader
        overline="Account"
        title="PROFILE"
        subtitle="Уровень, достижения и настройки"
        right={(
          <div
            aria-label="Настройки скоро появятся"
            title="Настройки скоро появятся"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-surface text-zinc-600"
          >
            <Settings size={19} aria-hidden="true" />
          </div>
        )}
      />

      <PosterTabs
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
        options={[{ value: 'profile', label: 'PROFILE' }, { value: 'achievements', label: 'ACHIEVEMENTS' }]}
      />

      {activeTab === 'profile' ? (
        <>
          <AppCard className="athletic-panel mb-4 rounded-[18px] p-5">
            <div className="flex items-center gap-4">
              <div className="display-heading flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-2xl text-red-100 shadow-red-soft">{user.firstName[0]}</div>
              <div className="min-w-0 flex-1">
                <p className="poster-overline">NoExcuses</p>
                <h2 className="display-heading mt-1 truncate text-2xl text-zinc-100">{user.firstName}</h2>
                <p className="truncate text-sm text-zinc-500">@{user.username}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-semibold text-zinc-300">Уровень {user.level}</span>
                <span className="text-zinc-500">{currentLevelXp}/{requiredXp} XP</span>
              </div>
              <ProgressBar value={xpPercent} />
            </div>
          </AppCard>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <StatCard label="Серия" value={user.streak} detail="дней дисциплины" />
            <StatCard label="Заморозки" value={user.streakFreezeCount} detail="доступно" icon={<Snowflake size={17} className="text-cyan-300" />} tone="cyan" />
          </div>

          <AppCard className="overflow-hidden">
            <p className="border-b border-white/[0.07] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.06em] text-accent">Настройки</p>
            <div className="flex min-h-14 w-full items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3 font-semibold text-zinc-300"><Globe size={18} className="text-zinc-500" />Язык</span>
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase text-zinc-600">Скоро</span>
            </div>
            <div className="flex min-h-14 w-full items-center justify-between border-t border-white/[0.07] px-4 py-3">
              <span className="flex items-center gap-3 font-semibold text-zinc-300"><Bell size={18} className="text-zinc-500" />Уведомления</span>
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-semibold uppercase text-zinc-600">Скоро</span>
            </div>
          </AppCard>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="display-heading text-lg text-zinc-100">Коллекция</h2>
              <p className="mt-1 text-xs text-zinc-500">Открыто {unlockedCount} из {achievements.length}</p>
            </div>
            <StatusBadge tone="red">{unlockedCount}/{achievements.length}</StatusBadge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <button key={achievement.id} type="button" onClick={() => setSelectedAchievement(achievement)} className={`rounded-xl border bg-surface p-3 text-center active:scale-[0.98] ${achievement.unlocked ? 'border-accent/25' : 'border-white/[0.07] opacity-45'}`}>
                <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${achievement.unlocked ? 'bg-accent/10' : 'bg-surface-light'}`}>{achievement.icon}</div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-300">{achievement.title}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 px-2 backdrop-blur-sm" onClick={() => setSelectedAchievement(null)}>
          <div className="w-full max-w-[430px] rounded-t-[14px] border border-b-0 border-white/[0.07] bg-[#0D0D0E] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex justify-end"><button type="button" onClick={() => setSelectedAchievement(null)} aria-label="Закрыть" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface text-zinc-400"><X size={17} /></button></div>
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl text-4xl ${selectedAchievement.unlocked ? 'border border-accent/25 bg-accent/10 shadow-red-soft' : 'bg-surface-light'}`}>{selectedAchievement.icon}</div>
              <p className="poster-overline">Достижение</p>
              <h2 className="display-heading mt-1 text-xl text-zinc-100">{selectedAchievement.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{selectedAchievement.description}</p>
              <div className={`mt-5 rounded-xl border p-4 ${selectedAchievement.unlocked ? 'border-accent/25 bg-accent/[0.06]' : 'border-white/[0.07] bg-surface'}`}><p className={selectedAchievement.unlocked ? 'font-semibold text-red-200' : 'text-sm text-zinc-500'}>{selectedAchievement.unlocked ? 'Открыто' : 'Ещё не открыто'}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
