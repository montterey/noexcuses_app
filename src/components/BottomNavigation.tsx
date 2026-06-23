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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#0B0B0C]/95 backdrop-blur-xl">
      <div
        className="mx-auto flex min-h-[72px] max-w-[430px] items-stretch px-1 pt-1"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-2 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-2 top-0 h-0.5 rounded-b-full bg-accent shadow-red-soft" />
              )}
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span
                className={`${tab.id === 'competitions' ? 'text-[7px]' : 'text-[8px]'} max-w-full truncate leading-[9px] font-semibold ${
                  isActive ? 'text-accent' : ''
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
