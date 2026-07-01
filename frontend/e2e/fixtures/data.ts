export const MOCK_DOCUMENTS = [
  {
    id: 'doc-001',
    titulo: 'Ata de Fundação do CAVN',
    slug: 'ata-de-fundacao-do-cavn',
    resumo: 'Ata histórica da fundação do Colégio Agrícola Vidal de Negreiros em 1953.',
    tipo_documento: 'ata',
    data_documento: '1953-03-15',
    status: 'publicado',
    status_display: 'Publicado',
    created_at: '2024-01-15T10:00:00Z',
    capa: null,
  },
  {
    id: 'doc-002',
    titulo: 'Relatório Anual 2023',
    slug: 'relatorio-anual-2023',
    resumo: 'Relatório de atividades do CAVN referente ao ano letivo de 2023.',
    tipo_documento: 'relatorio',
    data_documento: '2023-12-20',
    status: 'publicado',
    status_display: 'Publicado',
    created_at: '2024-02-01T08:00:00Z',
    capa: null,
  },
  {
    id: 'doc-003',
    titulo: 'Fotografia da Turma de Formandos 1985',
    slug: 'fotografia-turma-formandos-1985',
    resumo: 'Registro fotográfico da turma de concluintes do curso técnico em agropecuária.',
    tipo_documento: 'fotografia',
    data_documento: '1985-12-10',
    status: 'publicado',
    status_display: 'Publicado',
    created_at: '2024-03-10T14:00:00Z',
    capa: {
      id: 'file-001',
      url: '/media/documentos/2024/03/turma-1985.jpg',
      mime_type: 'image/jpeg',
      tipo_arquivo: 'original',
    },
  },
  {
    id: 'doc-004',
    titulo: 'Correspondência do Diretor 1972',
    slug: 'correspondencia-diretor-1972',
    resumo: 'Carta oficial do diretor ao Ministério da Educação.',
    tipo_documento: 'correspondencia',
    data_documento: '1972-06-22',
    status: 'publicado',
    status_display: 'Publicado',
    created_at: '2024-04-05T09:00:00Z',
    capa: null,
  },
  {
    id: 'doc-005',
    titulo: 'Projeto Pedagógico do Curso Técnico',
    slug: 'projeto-pedagogico-curso-tecnico',
    resumo: 'Documento com a proposta pedagógica do curso técnico em agropecuária.',
    tipo_documento: 'documento_pedagogico',
    data_documento: '2020-02-28',
    status: 'publicado',
    status_display: 'Publicado',
    created_at: '2024-05-20T11:00:00Z',
    capa: null,
  },
];

export const MOCK_CATEGORIES = [
  { id: 'cat-001', nome: 'Documentos Administrativos', slug: 'documentos-administrativos', ordem: 1, ativo: true, contagem_documentos: 45 },
  { id: 'cat-002', nome: 'Documentos Pedagógicos', slug: 'documentos-pedagogicos', ordem: 2, ativo: true, contagem_documentos: 30 },
  { id: 'cat-003', nome: 'Fotografias', slug: 'fotografias', ordem: 3, ativo: true, contagem_documentos: 120 },
  { id: 'cat-004', nome: 'Correspondências', slug: 'correspondencias', ordem: 4, ativo: true, contagem_documentos: 25 },
  { id: 'cat-005', nome: 'Produção Acadêmica', slug: 'producao-academica', ordem: 5, ativo: true, contagem_documentos: 18 },
];

export const MOCK_TIMELINE = [
  { id: 'tl-001', titulo: 'Fundação do CAVN', descricao: 'Criação do Colégio Agrícola Vidal de Negreiros.', data_evento: '1953-03-15', destaque: true },
  { id: 'tl-002', titulo: 'Primeira Turma de Formandos', descricao: 'Formatura da primeira turma do curso técnico.', data_evento: '1956-12-20', destaque: true },
  { id: 'tl-003', titulo: 'Reforma do Campus', descricao: 'Ampliação das instalações do campus.', data_evento: '1978-08-10', destaque: false },
  { id: 'tl-004', titulo: 'Parceria com UFPB', descricao: 'Integração oficial com a Universidade Federal da Paraíba.', data_evento: '2002-01-15', destaque: true },
];

export const MOCK_GALLERY = [
  {
    id: 'alb-001',
    titulo: 'Fotos Históricas',
    slug: 'fotos-historicas',
    destaque: true,
    capa_url: '/media/galeria/historica.jpg',
    fotos: [
      { id: 'foto-001', legenda: 'Vista aérea do campus - 1960', ordem: 1 },
      { id: 'foto-002', legenda: 'Salas de aula - 1970', ordem: 2 },
    ],
  },
  {
    id: 'alb-002',
    titulo: 'Eventos Recentes',
    slug: 'eventos-recentes',
    destaque: false,
    capa_url: null,
    fotos: [],
  },
];

export const MOCK_ACADEMIC = [
  {
    id: 'acad-001',
    titulo: 'Agricultura Sustentável no Semiárido',
    slug: 'agricultura-sustentavel-semiarido',
    tipo: 'dissertacao',
    autor: 'João Silva',
    ano: 2023,
    resumo: 'Pesquisa sobre práticas agrícolas sustentáveis na região semiárida paraibana.',
    ativo: true,
  },
  {
    id: 'acad-002',
    titulo: 'História da Educação Agrícola na Paraíba',
    slug: 'historia-educacao-agricola-paraiba',
    tipo: 'tese',
    autor: 'Maria Oliveira',
    ano: 2021,
    resumo: 'Tese doutoral sobre o desenvolvimento da educação agrícola no estado.',
    ativo: true,
  },
];
