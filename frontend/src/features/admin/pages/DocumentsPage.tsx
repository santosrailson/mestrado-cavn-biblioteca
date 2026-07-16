import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Archive, Send, Search, X } from 'lucide-react';
import adminApi from '../api/adminApi';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { Modal } from '@/shared/components/Modal';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canAdminister, canCurate } from '@/features/auth/lib/permissions';
import { useToast } from '@/shared/hooks/useToast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useLocale } from '@/shared/i18n';
import { formatDateBR } from '@/shared/lib/formatDate';
import { getTipoDocumentoLabel } from '@/shared/lib/documentLabels';
import { Documento, StatusDocumento, TipoDocumento } from '@/shared/types';
import { clsx } from 'clsx';

const statusColors: Record<StatusDocumento, string> = {
  rascunho: 'bg-surface-alt text-text',
  em_revisao: 'bg-warning-bg text-warning',
  aprovado: 'bg-primary/10 text-primary',
  rejeitado: 'bg-danger-bg text-danger',
  publicado: 'bg-success-bg text-success',
  arquivado: 'bg-surface-alt text-text-muted',
};

export function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLocale();
  const localizedDocumentTypes = Object.fromEntries(
    (
      [
        'ata',
        'relatorio',
        'correspondencia',
        'fotografia',
        'documento_administrativo',
        'producao_academica',
        'documento_pedagogico',
        'outro',
      ] as TipoDocumento[]
    ).map((value, index) => [value, t.admin.form.documentTypes[index]])
  ) as Partial<Record<TipoDocumento, string>>;
  const isCurator = canCurate(user);
  const isAdmin = canAdminister(user);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-documents', page, debouncedSearch],
    queryFn: () =>
      adminApi.documents({
        page,
        limit: 20,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  const workflowMutation = useMutation({
    mutationFn: async ({
      action,
      slug,
      motivo,
    }: {
      action: string;
      slug: string;
      motivo?: string;
    }) => {
      if (action === 'submeter') return adminApi.submitDocument(slug);
      if (action === 'aprovar') return adminApi.approveDocument(slug);
      if (action === 'rejeitar') return adminApi.rejectDocument(slug, motivo || '');
      if (action === 'arquivar') return adminApi.archiveDocument(slug);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedDoc(null);
      toast(
        variables.action === 'rejeitar'
          ? t.admin.documentRejectedSuccess
          : t.admin.documentUpdatedSuccess,
        'success'
      );
    },
    onError: () => {
      toast(t.admin.actionFailed, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => adminApi.deleteDocument(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast(t.admin.documentDeleteSuccess, 'success');
    },
    onError: () => {
      toast(t.admin.deleteFailed, 'error');
    },
  });

  const canEdit = (doc: Documento) => {
    if (isCurator || isAdmin) return true;
    return doc.criadoPorId === user?.id && doc.status === 'rascunho';
  };

  const canSubmit = (doc: Documento) => doc.status === 'rascunho' && doc.criadoPorId === user?.id;
  const canApprove = (doc: Documento) => doc.status === 'em_revisao' && isCurator;
  const canArchive = (doc: Documento) => doc.status === 'publicado' && isCurator;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text">{t.admin.documents}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t.admin.searchDocuments}
              className="input w-full pl-9 sm:w-64"
              aria-label={t.admin.searchDocuments}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={t.admin.clearSearch}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <Link to="/admin/documentos/novo" className="btn-primary no-underline">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t.admin.newDocument}
          </Link>
        </div>
      </div>

      {isLoading && <SkeletonTable rows={5} columns={5} />}
      {error && <ErrorMessage onRetry={refetch} />}

      {data && data.dados.length === 0 && !isLoading && (
        <EmptyState
          title={t.admin.noDocuments}
          description={
            debouncedSearch
              ? t.admin.noDocumentsSearchDescription
              : t.admin.noDocumentsStartDescription
          }
          action={
            debouncedSearch ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="btn-secondary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t.admin.clearSearch}
              </button>
            ) : (
              <Link to="/admin/documentos/novo" className="btn-primary no-underline">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t.admin.newDocument}
              </Link>
            )
          }
        />
      )}

      {data && data.dados.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.admin.title}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.type}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.status}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.date}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.dados.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3">
                      <Link to={`/documentos/${doc.slug}`} className="font-medium no-underline">
                        {doc.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {getTipoDocumentoLabel(doc.tipoDocumento, localizedDocumentTypes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            'inline-block rounded px-2 py-1 text-xs font-medium',
                            statusColors[doc.status] || statusColors.rascunho
                          )}
                        >
                          {t.admin.statuses[doc.status] || t.admin.statuses.rascunho}
                        </span>
                        {doc.status === 'rejeitado' && doc.motivoRejeicao && (
                          <span
                            className="max-w-[200px] truncate text-xs text-danger"
                            title={doc.motivoRejeicao}
                          >
                            {t.admin.rejectionReason}: {doc.motivoRejeicao}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDateBR(doc.dataDocumento)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {canEdit(doc) && (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/documentos/${doc.slug}/editar`)}
                            className="rounded p-1.5 text-primary hover:bg-primary/10"
                            aria-label={t.common.edit}
                            title={t.common.edit}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {canSubmit(doc) && (
                          <button
                            type="button"
                            onClick={() =>
                              workflowMutation.mutate({ action: 'submeter', slug: doc.slug })
                            }
                            className="rounded p-1.5 text-warning hover:bg-warning-bg"
                            aria-label={t.admin.workflow.submit}
                            title={t.admin.workflow.submit}
                          >
                            <Send className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {canApprove(doc) && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                workflowMutation.mutate({ action: 'aprovar', slug: doc.slug })
                              }
                              className="rounded p-1.5 text-success hover:bg-success-bg"
                              aria-label={t.admin.workflow.approve}
                              title={t.admin.workflow.approve}
                            >
                              <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowRejectModal(true);
                              }}
                              className="rounded p-1.5 text-danger hover:bg-danger-bg"
                              aria-label={t.admin.workflow.reject}
                              title={t.admin.workflow.reject}
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </>
                        )}
                        {canArchive(doc) && (
                          <button
                            type="button"
                            onClick={() =>
                              workflowMutation.mutate({ action: 'arquivar', slug: doc.slug })
                            }
                            className="rounded p-1.5 text-text-muted hover:bg-surface-alt"
                            aria-label={t.admin.workflow.archive}
                            title={t.admin.workflow.archive}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(t.admin.confirmDeleteDocument)) {
                                deleteMutation.mutate(doc.slug);
                              }
                            }}
                            className="rounded p-1.5 text-danger hover:bg-danger-bg"
                            aria-label={t.common.delete}
                            title={t.common.delete}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPaginas} onChange={setPage} />
        </Card>
      )}

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t.admin.rejectDocument}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedDoc &&
                workflowMutation.mutate({
                  action: 'rejeitar',
                  slug: selectedDoc.slug,
                  motivo: rejectReason,
                })
              }
            >
              {t.admin.workflow.reject}
            </Button>
          </div>
        }
      >
        <label htmlFor="reject-reason" className="label">
          {t.admin.rejectionReason}
        </label>
        <textarea
          id="reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="input min-h-[100px]"
        />
      </Modal>
    </>
  );
}
