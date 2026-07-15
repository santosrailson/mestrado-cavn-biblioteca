export type PerfilUsuario = 'catalogador' | 'curador' | 'administrador';
export type StatusDocumento =
  | 'rascunho'
  | 'em_revisao'
  | 'aprovado'
  | 'rejeitado'
  | 'publicado'
  | 'arquivado';
export type TipoDocumento =
  | 'ata'
  | 'relatorio'
  | 'correspondencia'
  | 'fotografia'
  | 'documento_administrativo'
  | 'producao_academica'
  | 'documento_pedagogico'
  | 'outro';
export type PrecisaoData = 'dia' | 'mes' | 'ano' | 'decada' | 'seculo' | 'desconhecida';
export type TipoArquivo = 'original' | 'thumbnail' | 'ocr_text' | 'watermark';
export type TipoAutoria = 'criador' | 'editor' | 'contribuidor' | 'compilador' | 'tradutor';
export type TipoRelacao = 'relacionado' | 'parte_de' | 'sucede' | 'precede' | 'referencia';
export type TipoProducaoAcademica =
  | 'dissertacao'
  | 'tese'
  | 'artigo'
  | 'tcc'
  | 'livro'
  | 'capitulo'
  | 'outro';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  perfis?: PerfilUsuario[];
  ativo: boolean;
  ultimoAcesso?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Autor {
  id: string;
  nome: string;
  tipo: 'pessoa_fisica' | 'pessoa_juridica' | 'instituicao' | 'desconhecido';
  biografia?: string;
  createdAt: string;
}

export interface Arquivo {
  id: string;
  documentoId: string;
  nomeOriginal: string;
  nomeArmazenado: string;
  caminho: string;
  mimeType: string;
  tamanhoBytes: number;
  checksumSha256: string;
  largura?: number;
  altura?: number;
  duracaoSegundos?: number;
  tipoArquivo: TipoArquivo;
  processadoOcr: boolean;
  conteudoOcr?: string;
  processamentoStatus?: 'pendente' | 'processando' | 'concluido' | 'falhou';
  processamentoEtapa?: string;
  processamentoProgresso?: number;
  processamentoErro?: string;
  url?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  slug: string;
  paiId?: string;
  pai?: Categoria;
  filhos?: Categoria[];
  ordem: number;
  icone?: string;
  ativo: boolean;
  contagemDocumentos?: number;
  createdAt: string;
}

export interface Tag {
  id: string;
  nome: string;
  slug: string;
  contagemUso: number;
  createdAt: string;
}

export interface Documento {
  id: string;
  titulo: string;
  tituloAlternativo?: string;
  descricao?: string;
  resumo?: string;
  codigoReferencia?: string;
  slug: string;
  tipoDocumento: TipoDocumento;
  status: StatusDocumento;
  motivoRejeicao?: string;
  dataDocumento?: string;
  dataPrecisao: PrecisaoData;
  coberturaTemporal?: string;
  coberturaEspacial?: string;
  idioma: string;
  direitos: string;
  fonte?: string;
  relacao?: string;
  criadoPorId: string;
  criadoPor?: Usuario;
  aprovadoPorId?: string;
  aprovadoPor?: Usuario;
  dataAprovacao?: string;
  autores?: Autor[];
  categorias?: Categoria[];
  tags?: Tag[];
  arquivos?: Arquivo[];
  capa?: Arquivo;
  relacionados?: DocumentoRelacionado[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DocumentoRelacionado {
  id: string;
  titulo: string;
  slug: string;
  tipoRelacao: TipoRelacao;
  thumbnailUrl?: string;
}

export interface TimelineEvent {
  id: string;
  titulo: string;
  descricao?: string;
  dataEvento: string;
  dataPrecisao: PrecisaoData;
  imagemDestaque?: string;
  documentoId?: string;
  documento?: Documento;
  destaque: boolean;
  ordem: number;
  createdAt: string;
}

export interface Album {
  id: string;
  titulo: string;
  descricao?: string;
  capa?: string;
  capaUrl?: string;
  slug: string;
  destaque: boolean;
  fotos?: Foto[];
  createdAt: string;
}

export interface Foto {
  id: string;
  album?: string;
  albumId?: string;
  imagem?: string;
  imagemUrl?: string;
  legenda?: string;
  ordem: number;
  createdAt: string;
}

export interface ProducaoAcademica {
  id: string;
  titulo: string;
  slug: string;
  tipo: TipoProducaoAcademica;
  autor: string;
  orientador?: string;
  ano: number;
  resumo?: string;
  palavrasChave?: string;
  urlAcesso?: string;
  arquivoId?: string;
  arquivo?: Arquivo;
  citacaoAbnt?: string;
  ativo: boolean;
  createdAt: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  tipo: 'string' | 'integer' | 'boolean' | 'json';
  descricao?: string;
  updatedAt: string;
}

export interface Auditoria {
  id: string;
  usuarioId?: string;
  usuario?: Usuario;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dadosAnteriores?: Record<string, unknown>;
  dadosNovos?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  temProxima: boolean;
  temAnterior: boolean;
}

export interface ApiError {
  sucesso: false;
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: Array<{ campo: string; mensagem: string }>;
  };
}

export interface ApiSuccess<T> {
  sucesso: true;
  mensagem?: string;
  dados: T;
}

export interface SearchFilters {
  q?: string;
  tipo?: TipoDocumento | '';
  categoria?: string;
  categoriaId?: string;
  tag?: string;
  dataInicio?: string;
  dataFim?: string;
  ano?: string;
  ordenacao?: 'relevancia' | 'data' | 'titulo';
}

export interface DashboardMetrics {
  totalDocumentos: number;
  documentosMes: number;
  pendentesRevisao: number;
  totalUsuarios: number;
  usuariosNovos: number;
  acessosMensais: { mes: string; acessos: number }[];
  documentosPorTipo: { tipo: string; quantidade: number }[];
  atividadesRecentes: Auditoria[];
}

export interface SolicitacaoSenha {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioPerfil: PerfilUsuario;
  criadoEm: string;
}
