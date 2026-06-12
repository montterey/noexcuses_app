import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      authenticateUser();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const authenticateUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Log Telegram WebApp data
      console.log('Telegram WebApp:', window.Telegram?.WebApp);
      console.log('initData:', window.Telegram?.WebApp?.initData);
      console.log('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
      console.log('user:', window.Telegram?.WebApp?.initDataUnsafe?.user);

      // Get Telegram user from WebApp SDK
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

      let telegramId: number;
      let username: string | null = null;
      let firstName: string;

      if (telegramUser) {
        // Real Telegram environment
        telegramId = telegramUser.id;
        username = telegramUser.username || null;
        firstName = telegramUser.first_name;
      } else {
        // Development fallback - use mock user
        telegramId = 123456789;
        username = 'dev_user';
        firstName = 'Александр';
      }

      // Call the get_or_create_user function
      const { data: userId, error: rpcError } = await supabase.rpc('get_or_create_user', {
        p_telegram_id: telegramId,
        p_username: username,
        p_first_name: firstName,
      });

      if (rpcError) throw rpcError;

      // Fetch user data
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      setUser({
        id: userData.id,
        username: userData.username || '',
        firstName: userData.first_name,
        avatar: telegramUser?.photo_url,
        level: userData.level,
        xp: userData.xp,
        streak: userData.streak,
        longestStreak: userData.longest_streak,
        totalGoalsCompleted: userData.total_goals_completed,
        xpThisWeek: userData.xp_this_week,
      });

      // Notify Telegram WebApp is ready
      window.Telegram?.WebApp?.ready?.();
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUser({
        ...user,
        level: data.level,
        xp: data.xp,
        streak: data.streak,
        longestStreak: data.longest_streak,
        totalGoalsCompleted: data.total_goals_completed,
        xpThisWeek: data.xp_this_week,
      });
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updateData: Record<string, unknown> = {};
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.xp !== undefined) updateData.xp = updates.xp;
    if (updates.streak !== undefined) updateData.streak = updates.streak;
    if (updates.longestStreak !== undefined) updateData.longest_streak = updates.longestStreak;
    if (updates.totalGoalsCompleted !== undefined) updateData.total_goals_completed = updates.totalGoalsCompleted;
    if (updates.xpThisWeek !== undefined) updateData.xp_this_week = updates.xpThisWeek;

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      setUser({ ...user, ...updates });
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
