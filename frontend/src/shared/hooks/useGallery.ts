import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { Album, Foto } from '@/shared/types';

export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await api.get<Album[]>('/galeria/albuns/');
      return response.data;
    },
  });
}

export function useAlbum(slug: string) {
  return useQuery({
    queryKey: ['album', slug],
    queryFn: async () => {
      const response = await api.get<Album>(`/galeria/albuns/${slug}/`);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function usePhotos(albumId?: string, page = 1, limit = 24) {
  return useQuery({
    queryKey: ['photos', albumId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (albumId) params.set('album_id', String(albumId));
      params.set('page', String(page));
      params.set('limit', String(limit));
      const response = await api.get<Foto[]>(`/galeria/fotos/?${params.toString()}`);
      return response.data;
    },
  });
}
