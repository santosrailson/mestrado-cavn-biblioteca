import { TipoDocumento, StatusDocumento } from '@/shared/types';

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  ata: 'Ata',
  relatorio: 'Relatório',
  correspondencia: 'Correspondência',
  fotografia: 'Fotografia',
  documento_administrativo: 'Documento Administrativo',
  producao_academica: 'Produção Acadêmica',
  documento_pedagogico: 'Documento Pedagógico',
  outro: 'Outro',
};

export const STATUS_DOCUMENTO_LABELS: Record<StatusDocumento, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
};

export function getTipoDocumentoLabel(
  tipo: TipoDocumento | string | undefined,
  labels?: Partial<Record<TipoDocumento, string>>
): string {
  if (!tipo) return '-';
  return labels?.[tipo as TipoDocumento] ?? TIPO_DOCUMENTO_LABELS[tipo as TipoDocumento] ?? tipo;
}

export function getStatusDocumentoLabel(
  status: StatusDocumento | string | undefined,
  labels?: Partial<Record<StatusDocumento, string>>
): string {
  if (!status) return 'Rascunho';
  return (
    labels?.[status as StatusDocumento] ??
    STATUS_DOCUMENTO_LABELS[status as StatusDocumento] ??
    status
  );
}
