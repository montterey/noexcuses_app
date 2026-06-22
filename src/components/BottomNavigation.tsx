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
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/5 safe-area-bottom">
      <div className="max-w-[430px] mx-auto flex items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 py-2 transition-all duration-200 ${
                isActive ? 'text-accent' : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
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
