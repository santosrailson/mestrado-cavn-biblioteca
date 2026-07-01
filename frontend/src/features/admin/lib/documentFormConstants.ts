import ptBR from '@/shared/i18n/pt-BR';

export const documentSteps = [
  ptBR.admin.stepIdentification,
  ptBR.admin.stepDescription,
  ptBR.admin.stepClassification,
  ptBR.admin.stepContext,
  ptBR.admin.stepFiles,
  ptBR.admin.stepRights,
];

export const tipoDocumentoOptions = [
  { value: 'ata', label: 'Ata' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'correspondencia', label: 'Correspondência' },
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'documento_administrativo', label: 'Documento administrativo' },
  { value: 'producao_academica', label: 'Produção acadêmica' },
  { value: 'documento_pedagogico', label: 'Documento pedagógico' },
  { value: 'outro', label: 'Outro' },
] as const;

export const dataPrecisaoOptions = [
  { value: 'dia', label: 'Dia' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
  { value: 'decada', label: 'Década' },
  { value: 'seculo', label: 'Século' },
  { value: 'desconhecida', label: 'Desconhecida' },
] as const;
