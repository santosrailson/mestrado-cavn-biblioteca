import { lazy, Suspense } from 'react';
import { FileText, Clock, Users, Eye, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { Card } from '@/shared/components/Card';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Skeleton } from '@/shared/components/Skeleton';
import { SectionHeader } from '@/shared/components/Section';
import { useOptionalLocale } from '@/shared/i18n';

const DocumentsByTypeChart = lazy(() =>
  import('../components/DocumentsByTypeChart').then((m) => ({ default: m.DocumentsByTypeChart }))
);
const MonthlyAccessChart = lazy(() =>
  import('../components/MonthlyAccessChart').then((m) => ({ default: m.MonthlyAccessChart }))
);

export function DashboardPage() {
  const { locale, t } = useOptionalLocale();
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
  });

  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <SectionHeader
        title={t.admin.dashboard}
        titleId="dashboard-title"
        subtitle={t.admin.overview}
      />

      {isLoading && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
          <Skeleton className="mt-6 h-80 w-full" />
        </>
      )}

      {!isLoading && metrics && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={FileText}
              label={t.admin.totalDocuments}
              value={metrics.totalDocumentos}
              trend={`+${metrics.documentosMes} ${t.admin.thisMonth}`}
              color="bg-blue-50 text-blue-700"
            />
            <MetricCard
              icon={Clock}
              label={t.admin.pendingReview}
              value={metrics.pendentesRevisao}
              trend={t.admin.toReview}
              color="bg-yellow-50 text-yellow-700"
              trendVariant="warning"
            />
            <MetricCard
              icon={Users}
              label={t.admin.totalUsers}
              value={metrics.totalUsuarios}
              trend={`+${metrics.usuariosNovos} ${t.admin.newUsers}`}
              color="bg-green-50 text-green-700"
            />
            <MetricCard
              icon={Eye}
              label={t.admin.monthlyAccess}
              value={metrics.acessosMensais?.reduce((acc, cur) => acc + cur.acessos, 0) ?? 0}
              trend={t.admin.accumulated}
              color="bg-purple-50 text-purple-700"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t.admin.documentsByType}</h2>
              <Suspense fallback={<ChartSkeleton />}>
                <DocumentsByTypeChart data={metrics.documentosPorTipo ?? []} />
              </Suspense>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t.admin.recentActivities}</h2>
              {metrics.atividadesRecentes && metrics.atividadesRecentes.length > 0 ? (
                <ul className="space-y-3">
                  {metrics.atividadesRecentes.slice(0, 6).map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 text-sm">
                      <Activity className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {activity.usuario?.nome ?? t.common.system} — {activity.acao}{' '}
                          {activity.entidade}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {new Date(activity.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">{t.admin.noRecentActivity}</p>
              )}
            </Card>
          </div>

          <Card className="mt-6">
            <h2 className="mb-4 text-lg font-semibold">{t.admin.monthlyAccess}</h2>
            <Suspense fallback={<ChartSkeleton />}>
              <MonthlyAccessChart data={metrics.acessosMensais ?? []} />
            </Suspense>
          </Card>
        </>
      )}
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
  trendVariant = 'positive',
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  trend: string;
  color: string;
  trendVariant?: 'positive' | 'warning';
}) {
  const isWarning = trendVariant === 'warning';
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p
          className={`text-xs flex items-center gap-1 ${isWarning ? 'text-yellow-600' : 'text-green-600'}`}
        >
          {isWarning ? (
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
          )}
          {trend}
        </p>
      </div>
    </Card>
  );
}
