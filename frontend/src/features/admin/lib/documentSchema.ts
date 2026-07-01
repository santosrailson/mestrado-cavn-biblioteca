import { z } from 'zod';

export const documentSchema = z.object({
  titulo: z.string().min(3, 'Título é obrigatório'),
  tituloAlternativo: z.string().optional(),
  descricao: z.string().optional(),
  resumo: z.string().optional(),
  tipoDocumento: z.enum([
    'ata',
    'relatorio',
    'correspondencia',
    'fotografia',
    'documento_administrativo',
    'producao_academica',
    'documento_pedagogico',
    'outro',
  ]),
  dataDocumento: z.string().optional(),
  dataPrecisao: z.enum(['dia', 'mes', 'ano', 'decada', 'seculo', 'desconhecida']),
  coberturaTemporal: z.string().optional(),
  coberturaEspacial: z.string().optional(),
  idioma: z.string().default('pt-BR'),
  direitos: z.string().default('Domínio público / CAVN-UFPB'),
  fonte: z.string().optional(),
  codigoReferencia: z.string().optional(),
  relacao: z.string().optional(),
  categoriaIds: z.array(z.string()).min(1, 'Selecione pelo menos uma categoria'),
  tags: z.array(z.string()).default([]),
  autores: z.array(z.string()).default([]),
});

export type DocumentFormData = z.infer<typeof documentSchema>;

export const defaultDocumentFormValues: DocumentFormData = {
  titulo: '',
  tituloAlternativo: '',
  descricao: '',
  resumo: '',
  tipoDocumento: 'ata',
  dataDocumento: '',
  dataPrecisao: 'dia',
  coberturaTemporal: '',
  coberturaEspacial: '',
  idioma: 'pt-BR',
  direitos: 'Domínio público / CAVN-UFPB',
  fonte: '',
  codigoReferencia: '',
  relacao: '',
  categoriaIds: [],
  tags: [],
  autores: [],
};
