import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, KeyRound } from 'lucide-react';
import { SectionHeader } from '@/shared/components/Section';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { useToast } from '@/shared/hooks/useToast';
import adminApi from '../api/adminApi';
import { useLocale } from '@/shared/i18n';

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PasswordRequestsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { locale, t } = useLocale();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-senha'],
    queryFn: adminApi.listarSolicitacoesSenha,
  });

  const aprovar = useMutation({
    mutationFn: (id: string) => adminApi.aprovarSolicitacaoSenha(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-senha'] });
      toast(t.admin.passwordChanged, 'success');
    },
    onError: () => toast(t.admin.passwordRequestError, 'error'),
  });

  const rejeitar = useMutation({
    mutationFn: (id: string) => adminApi.rejeitarSolicitacaoSenha(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-senha'] });
      toast(t.admin.rejectedPasswordMessage, 'info');
    },
    onError: () => toast(t.admin.passwordRequestError, 'error'),
  });

  return (
    <>
      <Breadcrumb items={[{ label: t.admin.passwordRequests }]} className="mb-6" />
      <SectionHeader
        title={t.admin.passwordRequests}
        titleId="pwd-requests-title"
        subtitle={t.admin.pendingPasswordDescription}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : solicitacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 text-center">
          <KeyRound className="mb-3 h-10 w-10 text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">{t.admin.noPendingPasswordRequests}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">{t.admin.user}</th>
                <th className="px-4 py-3">{t.admin.profile}</th>
                <th className="px-4 py-3">{t.admin.requestedAt}</th>
                <th className="px-4 py-3 text-right">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {solicitacoes.map((sol) => (
                <tr key={sol.id} className="hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{sol.usuarioNome}</p>
                    <p className="text-xs text-text-muted">{sol.usuarioEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {t.admin.profiles[sol.usuarioPerfil] ?? sol.usuarioPerfil}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(sol.criadoEm, locale)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => aprovar.mutate(sol.id)}
                        disabled={aprovar.isPending || rejeitar.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-success-bg px-3 py-1.5 text-xs font-medium text-success hover:opacity-80 disabled:opacity-50"
                        title={t.admin.workflow.approve}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t.admin.workflow.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejeitar.mutate(sol.id)}
                        disabled={aprovar.isPending || rejeitar.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-danger-bg px-3 py-1.5 text-xs font-medium text-danger hover:opacity-80 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t.admin.workflow.reject}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
