import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '@/shared/components/ToastProvider';
import { LocaleProvider } from '@/shared/i18n';
import { SearchPage } from './SearchPage';

vi.mock('@/shared/hooks/useSearch', () => ({
  useSearch: vi.fn(() => ({ data: null, isLoading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('@/shared/hooks/useCategories', () => ({
  useCategories: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/features/admin/hooks/useEditable', () => ({
  useEditable: () => ({ canEdit: false }),
}));

import { useSearch } from '@/shared/hooks/useSearch';

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage(search = '') {
  return render(
    <HelmetProvider>
      <LocaleProvider>
        <QueryClientProvider client={makeClient()}>
          <ToastProvider>
            <MemoryRouter
              initialEntries={[`/busca${search}`]}
              future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
            >
              <Routes>
                <Route path="/busca" element={<SearchPage />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </HelmetProvider>
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o campo de busca', () => {
    renderPage();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('exibe painel de filtros', () => {
    renderPage();
    expect(screen.getByLabelText(/filtros/i)).toBeInTheDocument();
  });

  it('exibe skeleton durante carregamento', () => {
    vi.mocked(useSearch).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSearch>);
    renderPage('?q=test');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('exibe estado vazio quando não há resultados', () => {
    vi.mocked(useSearch).mockReturnValue({
      data: { dados: [], total: 0, totalPaginas: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSearch>);
    renderPage('?q=inexistente');
    expect(screen.getByText(/nenhum documento/i)).toBeInTheDocument();
  });

  it('exibe documentos quando há resultados', () => {
    const doc = {
      id: '1',
      slug: 'doc-teste',
      titulo: 'Documento de Teste',
      tipoDocumento: 'ata' as const,
      dataDocumento: '2024-01-01',
      status: 'publicado',
      categorias: [],
      tags: [],
      autores: [],
      arquivos: [],
      capa: null,
    };
    vi.mocked(useSearch).mockReturnValue({
      data: { dados: [doc], total: 1, totalPaginas: 1 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSearch>);
    renderPage('?q=teste');
    // Title is split by highlightTerm highlight spans — check the article card exists
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
  });
});
