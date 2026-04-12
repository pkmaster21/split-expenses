import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@tabby/shared';
import { api } from './api.js';
import { queryKeys } from './queryKeys.js';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (redirect?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.VITE_API_URL ?? '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.getMe(),
    staleTime: Infinity,
    retry: false,
  });

  const login = (redirect?: string) => {
    const target = redirect ?? window.location.pathname;
    window.location.href = `${BASE}/api/v1/auth/google?redirect=${encodeURIComponent(target)}`;
  };

  const logout = async () => {
    await api.logout();
    queryClient.setQueryData(queryKeys.me(), null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
