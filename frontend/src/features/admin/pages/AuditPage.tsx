import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { useLocale } from '@/shared/i18n';
import { formatDateTimeBR } from '@/shared/lib/formatDate';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { t } = useLocale();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => adminApi.audit({ page, limit: 20 }),
  });

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t.admin.audit}</h1>
      <Card className="overflow-hidden p-0">
        {data && data.dados.length === 0 ? (
          <EmptyState title={t.admin.noAuditRecords} description={t.admin.emptyAuditDescription} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.admin.date}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.user}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.action}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.entity}</th>
                  <th className="px-4 py-3 font-semibold">{t.admin.id}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data?.dados.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3">{formatDateTimeBR(log.createdAt)}</td>
                    <td className="px-4 py-3">{log.usuario?.nome ?? t.common.system}</td>
                    <td className="px-4 py-3 font-medium">{log.acao}</td>
                    <td className="px-4 py-3">{log.entidade}</td>
                    <td className="px-4 py-3">{log.entidadeId ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && <Pagination page={page} totalPages={data.totalPaginas} onChange={setPage} />}
          </>
        )}
      </Card>
    </>
  );
}
