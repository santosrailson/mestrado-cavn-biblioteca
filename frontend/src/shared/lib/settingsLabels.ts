export interface SettingMeta {
  label: string;
  group: string;
  inputType?: 'text' | 'email' | 'color' | 'number' | 'textarea' | 'boolean';
}

export const SETTINGS_META: Record<string, SettingMeta> = {
  'site.titulo': { label: 'Título do site', group: 'Identidade', inputType: 'text' },
  'site.subtitulo': { label: 'Subtítulo', group: 'Identidade', inputType: 'text' },
  'site.descricao': { label: 'Descrição (SEO)', group: 'Identidade', inputType: 'textarea' },
  'site.email_contato': { label: 'E-mail de contato', group: 'Identidade', inputType: 'email' },
  'site.rodape_texto': { label: 'Texto do rodapé', group: 'Identidade', inputType: 'text' },
  'site.cor_primaria': { label: 'Cor primária', group: 'Aparência', inputType: 'color' },
  'site.permitir_cadastro_publico': {
    label: 'Permitir cadastro público',
    group: 'Acesso',
    inputType: 'boolean',
  },
  'documentos.itens_por_pagina': {
    label: 'Itens por página',
    group: 'Documentos',
    inputType: 'number',
  },
  'documentos.permitir_download': {
    label: 'Permitir download',
    group: 'Documentos',
    inputType: 'boolean',
  },
};

export const SETTINGS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SETTINGS_META).map(([k, v]) => [k, v.label])
);

export function getSettingLabel(chave: string): string {
  return SETTINGS_LABELS[chave] || chave;
}

export function getSettingMeta(chave: string): SettingMeta {
  return SETTINGS_META[chave] ?? { label: chave, group: 'Outros', inputType: 'text' };
}

export const GROUP_ORDER = ['Identidade', 'Aparência', 'Acesso', 'Documentos', 'Outros'];
