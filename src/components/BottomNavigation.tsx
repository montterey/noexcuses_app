import { LayoutDashboard, Target, Calendar, BarChart3, User, Trophy } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'goals', label: 'Цели', icon: Target },
  { id: 'programs', label: 'Программы', icon: Calendar },
  { id: 'competitions', label: 'Соревнования', icon: Trophy },
  { id: 'stats', label: 'Статистика', icon: BarChart3 },
  { id: 'profile', label: 'Профиль', icon: User },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#0D0D0E]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[430px] items-stretch px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {isActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-accent shadow-red-soft" />}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`${tab.id === 'competitions' ? 'text-[8px]' : 'text-[9px]'} leading-[9px] font-medium ${isActive ? 'text-accent' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
