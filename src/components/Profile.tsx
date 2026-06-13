import { useState } from 'react';
import { Settings, Trophy, Globe, Bell, ChevronRight, X } from 'lucide-react';
import { User, Achievement } from '../types';

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

  const settings = {
    language: 'RU',
    notificationTime: '09:00',
  };

  const currentLevelXp = user.xp % getRequiredXp(user.level);
  const xpPercent = (currentLevelXp / getRequiredXp(user.level)) * 100;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Профиль</h1>
        <button className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
          <Settings size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="flex bg-surface rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Профиль
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'achievements' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Trophy size={16} />
          Достижения
        </button>
      </div>

      {activeTab === 'profile' ? (
        <>
          <div className="bg-surface rounded-2xl p-5 border border-white/5 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-600 flex items-center justify-center text-2xl font-bold">
                {user.firstName[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{user.firstName}</h2>
                <p className="text-gray-400 text-sm">@{user.username}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Уровень {user.level}</span>
                <span className="text-sm text-gray-400">{currentLevelXp}/{getRequiredXp(user.level)} XP</span>
              </div>
              <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-400 rounded-full"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
            <h3 className="px-5 pt-5 pb-3 text-sm font-medium text-gray-400">Настройки</h3>

            <button className="w-full flex items-center justify-between p-4 hover:bg-surface-light transition-colors">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-gray-400" />
                <span className="font-medium">Язык</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{settings.language}</span>
                <ChevronRight size={18} className="text-gray-500" />
              </div>
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-surface-light transition-colors border-t border-white/5">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-400" />
                <span className="font-medium">Время уведомлений</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{settings.notificationTime}</span>
                <ChevronRight size={18} className="text-gray-500" />
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm">
              Открыто {unlockedCount} из {achievements.length}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <button
                key={achievement.id}
                onClick={() => setSelectedAchievement(achievement)}
                className={`bg-surface rounded-xl p-3 border border-white/5 text-center transition-all active:scale-95 ${
                  !achievement.unlocked ? 'opacity-50' : 'border-accent/30'
                }`}
              >
                <div
                  className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-2xl mb-2 ${
                    achievement.unlocked ? 'bg-accent/20' : 'bg-surface-light'
                  }`}
                >
                  {achievement.icon}
                </div>
                <p className={`text-xs font-medium ${achievement.unlocked ? '' : 'text-gray-500'}`}>
                  {achievement.title}
                </p>
                {achievement.unlocked && achievement.unlockedAt && (
                  <p className="text-[10px]
