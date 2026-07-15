import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { Documento, PaginatedResponse, SearchFilters } from '@/shared/types';

const buildSearchParams = (filters: SearchFilters & { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.categoria) params.set('categoria', filters.categoria);
  if (filters.categoriaId) params.set('categoria_id', String(filters.categoriaId));
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.dataInicio) params.set('data_inicio', filters.dataInicio);
  if (filters.dataFim) params.set('data_fim', filters.dataFim);
  if (filters.ano) params.set('ano', filters.ano);
  if (filters.ordenacao) params.set('ordenacao', filters.ordenacao);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params;
};

export function useDocuments(filters: SearchFilters & { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['documents', 'list', filters],
    queryFn: async () => {
      const params = buildSearchParams(filters);
      const response = await api.get<PaginatedResponse<Documento>>(
        `/documentos/?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useDocument(slug: string) {
  return useQuery({
    queryKey: ['document', slug],
    queryFn: async () => {
      const response = await api.get<Documento>(`/documentos/${slug}/`);
      return response.data;
    },
    enabled: !!slug,
    refetchInterval: (query) => {
      const files = query.state.data?.arquivos || [];
      return files.some(
        (file) =>
          file.processamentoStatus === 'pendente' || file.processamentoStatus === 'processando'
      )
        ? 2000
        : false;
    },
  });
}

export function useLatestDocuments(limit = 6) {
  return useDocuments({ page: 1, limit, ordenacao: 'data' });
}
