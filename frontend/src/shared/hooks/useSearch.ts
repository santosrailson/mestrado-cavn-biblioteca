import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { PaginatedResponse, Documento, SearchFilters } from '@/shared/types';
import { useDebounce } from './useDebounce';

export function useSearch(filters: SearchFilters & { page?: number; limit?: number }) {
  const debouncedQuery = useDebounce(filters.q, 300);

  return useQuery({
    queryKey: ['search', { ...filters, q: debouncedQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (filters.tipo) params.set('tipo', filters.tipo);
      if (filters.categoria) params.set('categoria', filters.categoria);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.dataInicio) params.set('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.set('data_fim', filters.dataFim);
      if (filters.ano) params.set('ano', filters.ano);
      if (filters.ordenacao) params.set('ordenacao', filters.ordenacao);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const response = await api.get<PaginatedResponse<Documento>>(
        `/documentos/busca/?${params.toString()}`
      );
      return response.data;
    },
    enabled: true,
  });
}
