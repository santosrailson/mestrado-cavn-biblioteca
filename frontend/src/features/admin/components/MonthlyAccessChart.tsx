import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AccessibleDataTable } from '@/shared/components/AccessibleDataTable';

interface AcessoItem {
  mes: string;
  acessos: number;
}

export function MonthlyAccessChart({ data }: { data: AcessoItem[] }) {
  const normalized = (data || []).map((item) => ({
    mes: item.mes || '-',
    acessos: item.acessos || 0,
  }));

  if (normalized.length === 0 || normalized.every((d) => d.acessos === 0)) {
    return <p className="text-sm text-[var(--color-text-muted)]">Nenhum dado disponível.</p>;
  }

  return (
    <div className="w-full" aria-describedby="monthly-access-summary">
      <p id="monthly-access-summary" className="sr-only">
        Gráfico de barras com a quantidade de acessos por mês. A tabela abaixo contém os mesmos
        dados.
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={normalized} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [value ?? 0, 'Acessos']} />
            <Bar dataKey="acessos" fill="#0369a1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <AccessibleDataTable
        caption="Acessos mensais"
        headers={['Mês', 'Acessos']}
        rows={normalized.map((item) => [item.mes, item.acessos])}
      />
    </div>
  );
}
