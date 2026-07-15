import { useOptionalLocale } from '@/shared/i18n';

interface AccessibleDataTableProps {
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function AccessibleDataTable({ caption, headers, rows }: AccessibleDataTableProps) {
  const { t } = useOptionalLocale();
  return (
    <details className="mt-3 rounded-md border border-border p-3 text-sm">
      <summary className="cursor-pointer font-medium text-primary">{t.common.viewTable}</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {headers.map((header) => (
                <th key={header} className="px-2 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-2 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
