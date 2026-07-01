import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import ptBR from '@/shared/i18n/pt-BR';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    const delta = 1;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={ptBR.common.previous}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>

      <div className="flex items-center gap-1">
        {getPages().map((p, index) =>
          typeof p === 'string' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-[var(--color-text-muted)]"
              aria-hidden="true"
            >
              {p}
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
            >
              {p}
            </Button>
          )
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={ptBR.common.next}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
