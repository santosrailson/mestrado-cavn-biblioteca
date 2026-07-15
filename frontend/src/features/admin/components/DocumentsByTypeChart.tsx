import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getTipoDocumentoLabel } from '@/shared/lib/documentLabels';
import { AccessibleDataTable } from '@/shared/components/AccessibleDataTable';

interface TipoItem {
  tipo: string;
  quantidade: number;
}

const COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  '#9333ea',
  'var(--color-danger)',
  '#0891b2',
  '#2563eb',
];

export function DocumentsByTypeChart({ data }: { data: TipoItem[] }) {
  const normalized = (data || []).map((item) => ({
    name: getTipoDocumentoLabel(item.tipo),
    value: item.quantidade || 0,
  }));

  if (normalized.length === 0 || normalized.every((d) => d.value === 0)) {
    return <p className="text-sm text-[var(--color-text-muted)]">Nenhum dado disponível.</p>;
  }

  return (
    <div className="w-full" aria-describedby="documents-by-type-summary">
      <p id="documents-by-type-summary" className="sr-only">
        Gráfico de barras com a distribuição de documentos por tipo. A tabela abaixo contém os
        mesmos dados.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={normalized} margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11 }}
              height={60}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [value ?? 0, 'Quantidade']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {normalized.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <AccessibleDataTable
        caption="Quantidade de documentos por tipo"
        headers={['Tipo', 'Quantidade']}
        rows={normalized.map((item) => [item.name, item.value])}
      />
    </div>
  );
}
