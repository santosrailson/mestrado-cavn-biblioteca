import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '@/shared/components/ToastProvider';
import { LocaleProvider } from '@/shared/i18n';
import { HomePage } from './HomePage';

vi.mock('@/shared/hooks/useCategories', () => ({
  useCategories: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/shared/hooks/useDocuments', () => ({
  useLatestDocuments: () => ({
    data: { dados: [], total: 0, totalPaginas: 1 },
    isLoading: false,
    error: null,
  }),
  useDocument: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@/shared/hooks/useTimeline', () => ({
  useTimeline: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/features/admin/hooks/useEditable', () => ({
  useEditable: () => ({ canEdit: false }),
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <HelmetProvider>
      <LocaleProvider>
        <QueryClientProvider client={makeClient()}>
          <ToastProvider>
            <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
              <HomePage />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </HelmetProvider>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título principal', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('exibe estado vazio quando não há documentos recentes', () => {
    renderPage();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('renderiza a barra de busca na hero section', () => {
    renderPage();
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
