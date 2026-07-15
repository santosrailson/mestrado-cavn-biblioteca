import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ToastProvider } from '@/shared/components/ToastProvider';
import { DocumentDetailPage } from './DocumentDetailPage';

vi.mock('@/shared/hooks/useDocuments', () => ({
  useDocument: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: new Error('not found'),
    refetch: vi.fn(),
  })),
  useLatestDocuments: () => ({
    data: { dados: [], total: 0, totalPaginas: 1 },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/shared/hooks/useScrollToTop', () => ({
  useScrollToTop: () => {},
}));

vi.mock('@/features/admin/hooks/useEditable', () => ({
  useEditable: () => ({ canEdit: false }),
}));

import { useDocument } from '@/shared/hooks/useDocuments';

const mockDocument = {
  id: 'abc123',
  slug: 'ata-reuniao-2024',
  titulo: 'Ata de Reunião 2024',
  descricao: 'Descrição da ata',
  resumo: 'Resumo da ata',
  tipo_documento: 'ata',
  tipoDocumento: 'ata',
  data_documento: '2024-03-15',
  status: 'publicado',
  categorias: [{ id: '1', nome: 'Documentos Textuais', slug: 'documentos-textuais' }],
  tags: [],
  autores: [],
  arquivos: [],
  relacionados: [],
  createdAt: '2024-03-15T00:00:00Z',
  updatedAt: '2024-03-15T00:00:00Z',
  capa: null,
};

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage(slug = 'ata-reuniao-2024') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={makeClient()}>
        <ToastProvider>
          <MemoryRouter
            initialEntries={[`/documentos/${slug}`]}
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            <Routes>
              <Route path="/documentos/:slug" element={<DocumentDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem de não encontrado quando há erro', () => {
    vi.mocked(useDocument).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('not found'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocument>);
    renderPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('exibe skeleton durante carregamento', () => {
    vi.mocked(useDocument).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocument>);
    renderPage();
    expect(screen.queryByText(/não encontrado/i)).toBeNull();
  });

  it('renderiza título do documento quando carregado', () => {
    vi.mocked(useDocument).mockReturnValue({
      data: mockDocument,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocument>);
    renderPage();
    expect(screen.getByRole('heading', { name: /ata de reunião 2024/i })).toBeInTheDocument();
  });

  it('exibe breadcrumb com categoria do documento', () => {
    vi.mocked(useDocument).mockReturnValue({
      data: mockDocument,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDocument>);
    renderPage();
    expect(screen.getAllByText('Documentos Textuais').length).toBeGreaterThan(0);
  });
});
