import { useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { Dashboard } from './components/Dashboard';
import { Goals } from './components/Goals';
import { Programs } from './components/Programs';
import { Stats } from './components/Stats';
import { Profile } from './components/Profile';
import { UserProvider, useUser } from './contexts/UserContext';
import { useGoals } from './hooks/useGoals';
import { usePrograms } from './hooks/usePrograms';
import { useAchievements } from './hooks/useAchievements';
import { useStats } from './hooks/useStats';

function AppContent() {
  const { user, loading: userLoading, error, updateUser, refreshUser } = useUser();
  const { goals, toggleGoal, addGoal } = useGoals();
  const { programs, startOrContinueProgram, startNewProgram } = usePrograms();
  const { achievements } = useAchievements();
  const { weeklyStats } = useStats();

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleGoalToggle = async (goalId: string) => {
    await toggleGoal(goalId);
    if (user) {
      await updateUser({ xp: user.xp + 10, xpThisWeek: user.xpThisWeek + 10 });
      await refreshUser();
    }
  };

  const handleStartNewProgram = async (code: 'fitness' | 'weight_loss' | 'study') => {
  await startNewProgram(code);
};

  const handleAddGoal = async (newGoal: {
    title: string;
    type: 'daily' | 'once';
    time?: string;
    why?: string;
  }) => {
    await addGoal(newGoal);
  };

  const handleStartProgram = async (programId: string) => {
    await startOrContinueProgram(programId);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent rounded-lg text-white"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user!} goals={goals} onGoalToggle={handleGoalToggle} onAddGoal={handleAddGoal} />;
      case 'goals':
        return <Goals goals={goals} onGoalToggle={handleGoalToggle} onAddGoal={handleAddGoal} />;
      case 'programs':
        return <Programs programs={programs} onStartProgram={handleStartProgram} onStartNewProgram={handleStartNewProgram} />;
      case 'stats':
        return <Stats user={user!} weeklyStats={weeklyStats} />;
      case 'profile':
        return <Profile user={user!} achievements={achievements} />;
      default:
        return <Dashboard user={user!} goals={goals} onGoalToggle={handleGoalToggle} onAddGoal={handleAddGoal} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-[430px] mx-auto min-h-screen pb-16">
        {renderScreen()}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
