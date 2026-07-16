import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/lib/api';
import { Configuracao } from '@/shared/types';

export const SYSTEM_CONFIG_KEY = ['system-config'] as const;

function applyConfigToDom(settings: Configuracao[]) {
  const get = (chave: string) => settings.find((s) => s.chave === chave)?.valor;

  const primaryColor = get('site.cor_primaria');
  if (primaryColor) {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
  }
}

export function useSystemConfig() {
  const { data } = useQuery({
    queryKey: SYSTEM_CONFIG_KEY,
    queryFn: () => api.get<Configuracao[]>('/config/').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data) applyConfigToDom(data);
  }, [data]);

  return data ?? [];
}

export function useSiteConfig() {
  const config = useSystemConfig();

  return useMemo(() => {
    const get = (chave: string, fallback = '') =>
      config.find((s) => s.chave === chave)?.valor ?? fallback;

    return {
      titulo: get('site.titulo'),
      subtitulo: get('site.subtitulo'),
      descricao: get('site.descricao'),
      emailContato: get('site.email_contato'),
      rodapeTexto: get('site.rodape_texto'),
      corPrimaria: get('site.cor_primaria', '#0369a1'),
      permitirCadastroPublico: get('site.permitir_cadastro_publico') === 'true',
      itensPorPagina: parseInt(get('documentos.itens_por_pagina', '20'), 10),
      permitirDownload: get('documentos.permitir_download') === 'true',
    };
  }, [config]);
}
