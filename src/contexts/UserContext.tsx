import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapUserData(userData: Record<string, unknown>, avatar?: string): User {
  const firstName = typeof userData.first_name === 'string' && userData.first_name.trim()
    ? userData.first_name.trim()
    : 'Пользователь';
  const username = typeof userData.username === 'string' && userData.username.trim()
    ? userData.username.trim()
    : 'user';

  return {
    id: String(userData.id || ''),
    username,
    firstName,
    avatar,
    level: Math.max(1, numberOrZero(userData.level)),
    xp: numberOrZero(userData.xp),
    streak: numberOrZero(userData.streak),
    longestStreak: numberOrZero(userData.longest_streak),
    streakFreezeCount: numberOrZero(userData.streak_freeze_count),
    totalGoalsCompleted: numberOrZero(userData.total_goals_completed),
    xpThisWeek: numberOrZero(userData.xp_this_week),
  };
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void authenticateUser();
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const authenticateUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      let telegramId: number;
      let username: string | null;
      let firstName: string;

      if (telegramUser) {
        telegramId = telegramUser.id;
        username = telegramUser.username || null;
        firstName = telegramUser.first_name || 'Пользователь';
      } else if (import.meta.env.DEV) {
        telegramId = 123456789;
        username = 'dev_user';
        firstName = 'Dev User';
      } else {
        throw new Error('Откройте NoExcuses внутри Telegram');
      }

      const { data: userId, error: rpcError } = await supabase.rpc('get_or_create_user', {
        p_telegram_id: telegramId,
        p_username: username,
        p_first_name: firstName,
      });
      if (rpcError) throw rpcError;
      if (!userId) throw new Error('Не удалось определить пользователя');

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (fetchError) throw fetchError;
      if (!userData) throw new Error('Профиль пользователя не найден');

      setUser(mapUserData(userData, telegramUser?.photo_url));
      window.Telegram?.WebApp?.ready?.();
    } catch (authenticationError) {
      console.error('Authentication error:', authenticationError);
      setUser(null);
      setError(authenticationError instanceof Error ? authenticationError.message : 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    const { data, error: refreshError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (refreshError) {
      console.error('Error refreshing user:', refreshError);
      return;
    }

    if (data) setUser(mapUserData(data, user.avatar));
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
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
