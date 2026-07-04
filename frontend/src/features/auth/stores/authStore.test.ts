import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, useAuthStoreWithSelectors } from './authStore';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { Usuario } from '@/shared/types';

const userFixture: Usuario = {
  id: '1',
  nome: 'Railson',
  email: 'railson@cavn.br',
  perfil: 'administrador',
  ativo: true,
  createdAt: '',
  updatedAt: '',
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('isAuthenticated é derivado — false quando user é null', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('isAuthenticated é true após setAuth', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(userFixture));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(userFixture);
  });

  it('isAuthenticated volta a false após logout', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(userFixture));
    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('hasRole retorna true para role correspondente', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(userFixture));
    expect(result.current.hasRole(['administrador'])).toBe(true);
    expect(result.current.hasRole(['catalogador'])).toBe(false);
  });

  it('hasRole retorna false quando não autenticado', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    expect(result.current.hasRole(['administrador'])).toBe(false);
  });

  it('hasRole respeita array de perfis', () => {
    const multiRoleUser: Usuario = {
      ...userFixture,
      perfil: 'catalogador',
      perfis: ['curador', 'administrador'],
    };
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(multiRoleUser));
    expect(result.current.hasRole(['curador'])).toBe(true);
  });

  it('não persiste user no localStorage', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(userFixture));
    expect(localStorage.getItem('cavn-auth')).toBeNull();
  });
});
