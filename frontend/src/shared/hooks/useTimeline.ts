import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { TimelineEvent } from '@/shared/types';

export function useTimeline(periodo?: string, destaque?: boolean) {
  return useQuery({
    queryKey: ['timeline', periodo, destaque],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (periodo) params.set('periodo', periodo);
      if (destaque !== undefined) params.set('destaque', String(destaque));
      const response = await api.get<TimelineEvent[]>(`/timeline/eventos/?${params.toString()}`);
      return response.data;
    },
  });
}
