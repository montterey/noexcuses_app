import { useState } from 'react';

import { BottomNavigation } from './components/BottomNavigation';
import { Dashboard } from './components/Dashboard';
import { Goals } from './components/Goals';
import { Programs } from './components/Programs';
import { Stats } from './components/Stats';
import { Profile } from './components/Profile';
import { Competitions } from './components/Competitions';

import { UserProvider, useUser } from './contexts/UserContext';

import { useGoals } from './hooks/useGoals';
import { usePrograms } from './hooks/usePrograms';
import { useAchievements } from './hooks/useAchievements';
import { useStats } from './hooks/useStats';
import { supabase } from './lib/supabase';
import { GoalFrequency, ProgramCode } from './types';

type GoalMutationResult = { success: boolean; error?: string };

function getMutationError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Неизвестная ошибка');
  }
  return 'Неизвестная ошибка';
}

function AppContent() {
  const { user, loading: userLoading, error, refreshUser } = useUser();

  const {
    goals,
    completeGoal,
    skipGoal,
    freezeGoal,
    postponeGoal,
    addGoal,
    refreshGoals,
  } = useGoals();
  const { programs, startOrContinueProgram, startNewProgram } = usePrograms();

  const { achievements, refreshAchievements } = useAchievements();
  const { weeklyStats, refreshStats } = useStats();

  const [activeTab, setActiveTab] = useState('dashboard');

  const refreshAfterGoalAction = async () => {
    await Promise.all([
      refreshUser(),
      refreshStats(),
      refreshAchievements(),
    ]);
  };

  const handleGoalDone = async (goalId: string) => {
    await completeGoal(goalId);
    await refreshAfterGoalAction();
  };

  const handleGoalSkip = async (goalId: string) => {
    await skipGoal(goalId);
    await refreshAfterGoalAction();
  };

  const handleGoalFreeze = async (goalId: string) => {
    await freezeGoal(goalId);
    await refreshAfterGoalAction();
  };

  const handleGoalPostpone = async (goalId: string, time: string) => {
    const success = await postponeGoal(goalId, time);
    if (success) await refreshAfterGoalAction();
    return success;
  };

  const handleUpdateGoal = async (
    goalId: string,
    updates: { title: string; time?: string; why?: string }
  ): Promise<GoalMutationResult> => {
    if (!user) return { success: false, error: 'Пользователь не загружен' };

    const title = updates.title.trim();
    if (!title) return { success: false, error: 'Введите название цели' };

    try {
      const { error: updateError } = await supabase
        .from('goals')
        .update({
          title,
          time: updates.time || null,
          why: updates.why?.trim() || null,
        })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .eq('active', true);

      if (updateError) throw updateError;
      await refreshGoals();
      return { success: true };
    } catch (updateError) {
      console.error('Error updating goal:', updateError);
      return { success: false, error: getMutationError(updateError) };
    }
  };

  const handleDeleteGoal = async (goalId: string): Promise<GoalMutationResult> => {
    if (!user) return { success: false, error: 'Пользователь не загружен' };

    try {
      const { error: deleteError } = await supabase
        .from('goals')
        .update({ active: false })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .eq('active', true);

      if (deleteError) throw deleteError;
      await refreshGoals();
      return { success: true };
    } catch (deleteError) {
      console.error('Error deleting goal:', deleteError);
      return { success: false, error: getMutationError(deleteError) };
    }
  };

  const handleStartNewProgram = async (code: ProgramCode) => {
    const result = await startNewProgram(code);

    if (result.success) {
      await refreshAfterGoalAction();
    }

    return result;
  };

  const handleAddGoal = async (newGoal: {
    title: string;
    type: GoalFrequency;
    time?: string;
    why?: string;
  }) => {
    return addGoal(newGoal);
  };

  const handleStartProgram = async (programId: string) => {
    const result = await startOrContinueProgram(programId);

    if (result.success) {
      await refreshAfterGoalAction();
    }

    return result;
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
        return (
          <Dashboard
            user={user!}
            goals={goals}
            onGoalDone={handleGoalDone}
            onGoalSkip={handleGoalSkip}
            onGoalFreeze={handleGoalFreeze}
            onGoalPostpone={handleGoalPostpone}
            onAddGoal={handleAddGoal}
            onNavigate={setActiveTab}
          />
        );

      case 'goals':
        return (
          <Goals
            user={user!}
            goals={goals}
            onGoalDone={handleGoalDone}
            onGoalSkip={handleGoalSkip}
            onGoalFreeze={handleGoalFreeze}
            onGoalPostpone={handleGoalPostpone}
            onAddGoal={handleAddGoal}
            onGoalUpdate={handleUpdateGoal}
            onGoalDelete={handleDeleteGoal}
          />
        );

      case 'programs':
        return (
          <Programs
            programs={programs}
            onStartProgram={handleStartProgram}
            onStartNewProgram={handleStartNewProgram}
          />
        );

      case 'stats':
        return <Stats user={user!} weeklyStats={weeklyStats} />;

      case 'competitions':
        return <Competitions />;

      case 'profile':
        return <Profile user={user!} achievements={achievements} />;

      default:
        return (
          <Dashboard
            user={user!}
            goals={goals}
            onGoalDone={handleGoalDone}
            onGoalSkip={handleGoalSkip}
            onGoalFreeze={handleGoalFreeze}
            onGoalPostpone={handleGoalPostpone}
            onAddGoal={handleAddGoal}
            onNavigate={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <main className="page-container">
        {renderScreen()}
      </main>

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
