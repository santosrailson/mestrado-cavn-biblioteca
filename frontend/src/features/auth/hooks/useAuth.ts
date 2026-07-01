import { useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore, useAuthStoreWithSelectors } from '../stores/authStore';
import api from '@/shared/lib/api';
import { Usuario } from '@/shared/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface TwoFactorChallenge {
  twofactorRequired: true;
  userId: string;
  email: string;
}

type LoginResponse = {
  usuario: Usuario;
} | TwoFactorChallenge;

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout, hasRole } = useAuthStoreWithSelectors();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post<LoginResponse>('/auth/login/', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      if ('twofactorRequired' in data && data.twofactorRequired) {
        return;
      }
      if ('usuario' in data && data.usuario) {
        setAuth(data.usuario);
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout/');
    },
    onSettled: () => {
      logout();
    },
  });

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    loginData: loginMutation.data,
    logout: handleLogout,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    hasRole,
  };
}

/**
 * Valida a sessão com o servidor na montagem do app.
 * Se o cookie expirou ou foi revogado, limpa o estado local.
 * Deve ser montado uma única vez na raiz da aplicação.
 */
export function useAuthSync() {
  const { user, setAuth, logout } = useAuthStore((s) => ({
    user: s.user,
    setAuth: s.setAuth,
    logout: s.logout,
  }));

  // Valida sessão ao abrir o app se houver usuário em cache local
  useQuery({
    queryKey: ['auth-session-validate'],
    queryFn: async () => {
      const res = await api.get<Usuario>('/auth/me/');
      setAuth(res.data);
      return res.data;
    },
    enabled: user !== null,
    retry: false,
    staleTime: 5 * 60 * 1000, // Revalida no máximo a cada 5 min
  });

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);
}
