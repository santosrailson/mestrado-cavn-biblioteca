import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import adminApi from '../api/adminApi';
import { DashboardMetrics } from '@/shared/types';

vi.mock('../api/adminApi');
vi.mock('../components/DocumentsByTypeChart', () => ({
  DocumentsByTypeChart: () => <div data-testid="chart-tipo" />,
}));
vi.mock('../components/MonthlyAccessChart', () => ({
  MonthlyAccessChart: () => <div data-testid="chart-acesso" />,
}));

const mockAdminApi = vi.mocked(adminApi);

const metricsFixture: DashboardMetrics = {
  totalDocumentos: 42,
  documentosMes: 5,
  pendentesRevisao: 3,
  totalUsuarios: 10,
  usuariosNovos: 2,
  acessosMensais: [{ mes: '2026-01', acessos: 100 }],
  documentosPorTipo: [{ tipo: 'fotografia', quantidade: 10 }],
  atividadesRecentes: [],
};

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe skeletons enquanto carrega', () => {
    mockAdminApi.dashboard = vi.fn(() => new Promise(() => {}));
    const { container } = renderWithClient(<DashboardPage />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('exibe métricas após carregamento', async () => {
    mockAdminApi.dashboard = vi.fn().mockResolvedValue(metricsFixture);
    renderWithClient(<DashboardPage />);
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('exibe mensagem de erro quando a API falha', async () => {
    mockAdminApi.dashboard = vi.fn().mockRejectedValue(new Error('Erro de rede'));
    renderWithClient(<DashboardPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
