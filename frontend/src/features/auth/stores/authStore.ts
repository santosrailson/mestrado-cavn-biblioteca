import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Usuario, PerfilUsuario } from '@/shared/types';

interface AuthState {
  user: Usuario | null;
  setAuth: (user: Usuario) => void;
  logout: () => void;
  hasRole: (roles: PerfilUsuario[]) => boolean;
}

interface AuthSelectors {
  /** Derivado de user — nunca armazenado separadamente no localStorage */
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setAuth: (user) => {
        set({ user });
      },
      logout: () => {
        set({ user: null });
      },
      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        const userRoles = user.perfis && user.perfis.length > 0 ? user.perfis : [user.perfil];
        return roles.some((role) => userRoles.includes(role));
      },
    }),
    {
      name: 'cavn-auth',
      // Persiste apenas o perfil do usuário (para renderização da UI).
      // A autenticação real é validada pelo cookie httpOnly no servidor.
      partialize: (state) => ({ user: state.user }),
    }
  )
);

/** Hook que inclui isAuthenticated derivado do user, sem armazenar booleano separado. */
export function useAuthStoreWithSelectors(): AuthState & AuthSelectors {
  const state = useAuthStore();
  return { ...state, isAuthenticated: state.user !== null };
}
