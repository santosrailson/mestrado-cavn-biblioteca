import { create } from 'zustand';
import { Usuario, PerfilUsuario } from '@/shared/types';

interface AuthState {
  user: Usuario | null;
  setAuth: (user: Usuario) => void;
  logout: () => void;
  hasRole: (roles: PerfilUsuario[]) => boolean;
}

interface AuthSelectors {
  /** Derivado de user — nunca armazenado separadamente. */
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
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
}));

/** Hook que inclui isAuthenticated derivado do user, sem armazenar booleano separado. */
export function useAuthStoreWithSelectors(): AuthState & AuthSelectors {
  const state = useAuthStore();
  return { ...state, isAuthenticated: state.user !== null };
}
