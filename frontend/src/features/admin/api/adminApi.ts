import api from '@/shared/lib/api';
import {
  Documento,
  Categoria,
  Tag,
  TimelineEvent,
  Usuario,
  Configuracao,
  Auditoria,
  Album,
  Foto,
  ProducaoAcademica,
  PaginatedResponse,
  DashboardMetrics,
  TipoDocumento,
  PrecisaoData,
  SolicitacaoSenha,
} from '@/shared/types';

export interface DocumentoFormPayload {
  titulo: string;
  tituloAlternativo?: string;
  descricao?: string;
  resumo?: string;
  tipoDocumento: TipoDocumento;
  dataDocumento?: string;
  dataPrecisao: PrecisaoData;
  coberturaTemporal?: string;
  coberturaEspacial?: string;
  idioma: string;
  direitos: string;
  fonte?: string;
  codigoReferencia?: string;
  relacao?: string;
  autorIds: string[];
  autores: string[];
  categoriaIds: string[];
  tags: string[];
}

const toQuery = (params?: Record<string, string | number>) =>
  params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';

export const adminApi = {
  dashboard: () => api.get<DashboardMetrics>('/dashboard/').then((r) => r.data),

  documents: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Documento>>(`/documentos/${toQuery(params)}`).then((r) => r.data),

  document: (slug: string) => api.get<Documento>(`/documentos/${slug}/`).then((r) => r.data),
  createDocument: (data: DocumentoFormPayload) =>
    api.post<Documento>('/documentos/', data).then((r) => r.data),
  updateDocument: (slug: string, data: DocumentoFormPayload) =>
    api.put<Documento>(`/documentos/${slug}/`, data).then((r) => r.data),
  deleteDocument: (slug: string) => api.delete(`/documentos/${slug}/`),
  submitDocument: (slug: string) =>
    api.post<Documento>(`/documentos/${slug}/submeter/`).then((r) => r.data),
  approveDocument: (slug: string) =>
    api.post<Documento>(`/documentos/${slug}/aprovar/`).then((r) => r.data),
  publishDocument: (slug: string) =>
    api.post<Documento>(`/documentos/${slug}/publicar/`).then((r) => r.data),
  rejectDocument: (slug: string, motivo: string) =>
    api.post<Documento>(`/documentos/${slug}/rejeitar/`, { motivo }).then((r) => r.data),
  archiveDocument: (slug: string) =>
    api.post<Documento>(`/documentos/${slug}/arquivar/`).then((r) => r.data),

  uploadFile: (documentoSlug: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('arquivo', file);
    return api
      .post(`/documentos/${documentoSlug}/arquivos/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data);
  },

  categories: () => api.get<Categoria[]>('/categorias/').then((r) => r.data),
  createCategory: (data: Partial<Categoria>) =>
    api.post<Categoria>('/categorias/', data).then((r) => r.data),
  updateCategory: (id: string, data: Partial<Categoria>) =>
    api.put<Categoria>(`/categorias/${id}/`, data).then((r) => r.data),
  deleteCategory: (id: string) => api.delete(`/categorias/${id}/`),

  tags: () => api.get<Tag[]>('/tags/').then((r) => r.data),
  createTag: (data: Partial<Tag>) => api.post<Tag>('/tags/', data).then((r) => r.data),
  updateTag: (id: string, data: Partial<Tag>) =>
    api.put<Tag>(`/tags/${id}/`, data).then((r) => r.data),
  deleteTag: (id: string) => api.delete(`/tags/${id}/`),

  timeline: () => api.get<TimelineEvent[]>('/timeline/eventos/').then((r) => r.data),
  createTimelineEvent: (data: FormData | Partial<TimelineEvent>) =>
    api
      .post<TimelineEvent>('/timeline/eventos/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  updateTimelineEvent: (id: string, data: FormData | Partial<TimelineEvent>) =>
    api
      .put<TimelineEvent>(`/timeline/eventos/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  deleteTimelineEvent: (id: string) => api.delete(`/timeline/eventos/${id}/`),

  users: () => api.get<Usuario[]>('/auth/usuarios/').then((r) => r.data),
  createUser: (data: Partial<Usuario> & { senha: string }) =>
    api.post<Usuario>('/auth/usuarios/', data).then((r) => r.data),
  updateUser: (id: string, data: Partial<Usuario>) =>
    api.put<Usuario>(`/auth/usuarios/${id}/`, data).then((r) => r.data),
  toggleUserStatus: (id: string, ativo: boolean) =>
    api.patch<Usuario>(`/auth/usuarios/${id}/`, { ativo }).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/auth/usuarios/${id}/`),

  settings: () => api.get<Configuracao[]>('/config/').then((r) => r.data),
  updateSetting: (chave: string, valor: string) =>
    api.patch<Configuracao>(`/config/${chave}/`, { valor }).then((r) => r.data),

  albums: () => api.get<Album[]>('/galeria/albuns/').then((r) => r.data),
  createAlbum: (data: FormData) =>
    api
      .post<Album>('/galeria/albuns/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  updateAlbum: (slug: string, data: FormData) =>
    api
      .put<Album>(`/galeria/albuns/${slug}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  deleteAlbum: (slug: string) => api.delete(`/galeria/albuns/${slug}/`),

  photos: (album?: string) =>
    api.get<Foto[]>(`/galeria/fotos/${album ? `?album=${album}` : ''}`).then((r) => r.data),
  createPhoto: (data: FormData) =>
    api
      .post<Foto>('/galeria/fotos/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  updatePhoto: (id: string, data: FormData) =>
    api
      .put<Foto>(`/galeria/fotos/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  deletePhoto: (id: string) => api.delete(`/galeria/fotos/${id}/`),

  audit: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Auditoria>>(`/audit/${toQuery(params)}`).then((r) => r.data),

  // Senhas
  alterarSenha: (data: { senhaAtual: string; novaSenha: string }) =>
    api.post('/auth/alterar-senha/', data).then((r) => r.data),
  solicitarSenha: (novaSenha: string) =>
    api.post('/auth/solicitar-senha/', { novaSenha }).then((r) => r.data),
  statusSolicitacaoSenha: () =>
    api
      .get<{ status: string | null; criadoEm?: string }>('/auth/status-senha/')
      .then((r) => r.data),
  listarSolicitacoesSenha: () =>
    api.get<SolicitacaoSenha[]>('/auth/solicitacoes-senha/').then((r) => r.data),
  aprovarSolicitacaoSenha: (id: string) =>
    api.post(`/auth/solicitacoes-senha/${id}/aprovar/`).then((r) => r.data),
  rejeitarSolicitacaoSenha: (id: string) =>
    api.post(`/auth/solicitacoes-senha/${id}/rejeitar/`).then((r) => r.data),

  producaoAcademica: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedResponse<ProducaoAcademica>>(`/producao-academica/${toQuery(params)}`)
      .then((r) => r.data),
  createProducaoAcademica: (data: FormData) =>
    api
      .post<ProducaoAcademica>('/producao-academica/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  updateProducaoAcademica: (slug: string, data: FormData) =>
    api
      .put<ProducaoAcademica>(`/producao-academica/${slug}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  deleteProducaoAcademica: (slug: string) => api.delete(`/producao-academica/${slug}/`),
};

export default adminApi;
