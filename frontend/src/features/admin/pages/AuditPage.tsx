import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Pagination } from '@/shared/components/Pagination';
import ptBR from '@/shared/i18n/pt-BR';
import { formatDateTimeBR } from '@/shared/lib/formatDate';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => adminApi.audit({ page, limit: 20 }),
  });

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{ptBR.admin.audit}</h1>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Usuário</th>
              <th className="px-4 py-3 font-semibold">Ação</th>
              <th className="px-4 py-3 font-semibold">Entidade</th>
              <th className="px-4 py-3 font-semibold">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {data?.dados.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">{formatDateTimeBR(log.createdAt)}</td>
                <td className="px-4 py-3">{log.usuario?.nome ?? 'Sistema'}</td>
                <td className="px-4 py-3 font-medium">{log.acao}</td>
                <td className="px-4 py-3">{log.entidade}</td>
                <td className="px-4 py-3">{log.entidadeId ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination page={page} totalPages={data.totalPaginas} onChange={setPage} />}
      </Card>
    </>
  );
}
