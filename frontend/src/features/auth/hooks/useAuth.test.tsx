import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthSync } from './useAuth';
import { useAuthStore } from '../stores/authStore';
import api from '@/shared/lib/api';

vi.mock('@/shared/lib/api');

describe('useAuthSync', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    vi.clearAllMocks();
  });

  it('atualiza a store com os dados retornados por /auth/me/', async () => {
    const usuario = {
      id: '1',
      nome: 'Fulano',
      email: 'fulano@cavn.br',
      perfil: 'catalogador',
      ativo: true,
    };
    useAuthStore.setState({ user: usuario as never });
    vi.mocked(api.get).mockResolvedValue({ data: usuario });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useAuthSync(), { wrapper });

    await waitFor(() => {
      expect(useAuthStore.getState().user).toEqual(usuario);
    });
    expect(api.get).toHaveBeenCalledWith('/auth/me/');
  });
});
