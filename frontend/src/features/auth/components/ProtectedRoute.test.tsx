import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminRoute, CuratorRoute, CatalogerRoute } from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import { Usuario } from '@/shared/types';

vi.mock('../hooks/useAuth');

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const makeUser = (perfil: Usuario['perfil']): Usuario => ({
  id: '1',
  nome: 'Teste',
  email: 'teste@cavn.br',
  perfil,
  ativo: true,
  createdAt: '',
  updatedAt: '',
});

function renderWithRouter(element: React.ReactNode, initialPath = '/admin') {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/admin" element={element} />
        <Route path="/login" element={<div>Página de Login</div>} />
        <Route path="/acesso-negado" element={<div>Acesso Negado</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute — redirecionamento por autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CatalogerRoute redireciona para /login quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    renderWithRouter(
      <CatalogerRoute>
        <div>Conteúdo</div>
      </CatalogerRoute>
    );
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('CuratorRoute redireciona para /login quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    renderWithRouter(
      <CuratorRoute>
        <div>Conteúdo</div>
      </CuratorRoute>
    );
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('AdminRoute redireciona para /login quando não autenticado', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    renderWithRouter(
      <AdminRoute>
        <div>Conteúdo</div>
      </AdminRoute>
    );
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('CatalogerRoute redireciona para /acesso-negado quando autenticado sem role suficiente', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: makeUser('catalogador'),
    });
    renderWithRouter(
      <AdminRoute>
        <div>Conteúdo Admin</div>
      </AdminRoute>
    );
    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Admin')).not.toBeInTheDocument();
  });

  it('CatalogerRoute renderiza conteúdo para catalogador autenticado', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: makeUser('catalogador'),
    });
    renderWithRouter(
      <CatalogerRoute>
        <div>Painel</div>
      </CatalogerRoute>
    );
    expect(screen.getByText('Painel')).toBeInTheDocument();
  });

  it('AdminRoute renderiza conteúdo para administrador autenticado', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: makeUser('administrador'),
    });
    renderWithRouter(
      <AdminRoute>
        <div>Área Admin</div>
      </AdminRoute>
    );
    expect(screen.getByText('Área Admin')).toBeInTheDocument();
  });

  it('CuratorRoute redireciona para /acesso-negado para catalogador', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: makeUser('catalogador'),
    });
    renderWithRouter(
      <CuratorRoute>
        <div>Curadoria</div>
      </CuratorRoute>
    );
    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
  });
});
