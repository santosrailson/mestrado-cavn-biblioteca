import type { Translation } from '@/shared/i18n';

export function getDocumentSteps(t: Translation) {
  return [
    t.admin.stepIdentification,
    t.admin.stepDescription,
    t.admin.stepClassification,
    t.admin.stepContext,
    t.admin.stepFiles,
    t.admin.stepRights,
  ];
}

export function getTipoDocumentoOptions(t: Translation) {
  const options = t.admin.form.documentTypes;
  return [
    { value: 'ata', label: options[0] },
    { value: 'relatorio', label: options[1] },
    { value: 'correspondencia', label: options[2] },
    { value: 'fotografia', label: options[3] },
    { value: 'documento_administrativo', label: options[4] },
    { value: 'producao_academica', label: options[5] },
    { value: 'documento_pedagogico', label: options[6] },
    { value: 'outro', label: options[7] },
  ] as const;
}

export function getDataPrecisaoOptions(t: Translation) {
  const labels = t.admin.form.datePrecisions;
  return [
    { value: 'dia', label: labels[0] },
    { value: 'mes', label: labels[1] },
    { value: 'ano', label: labels[2] },
    { value: 'decada', label: labels[3] },
    { value: 'seculo', label: labels[4] },
    { value: 'desconhecida', label: labels[5] },
  ] as const;
}
