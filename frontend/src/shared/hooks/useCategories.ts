import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { Categoria } from '@/shared/types';

export function useCategories(withCount = true) {
  return useQuery({
    queryKey: ['categories', withCount],
    queryFn: async () => {
      const response = await api.get<Categoria[]>(`/categorias/?comContagem=${withCount}`, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const response = await api.get<Categoria>(`/categorias/${slug}/`);
      return response.data;
    },
    enabled: !!slug,
  });
}
