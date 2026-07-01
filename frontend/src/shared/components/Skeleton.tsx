import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />;
}

interface SkeletonCardProps {
  cover?: boolean;
  lines?: number;
}

export function SkeletonCard({ cover = true, lines = 2 }: SkeletonCardProps) {
  return (
    <div className="card flex h-full flex-col p-0">
      {cover && <Skeleton className="aspect-[4/3] rounded-none rounded-t-xl" />}
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-2 h-5 w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-4 w-full" />
        ))}
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  columns?: number;
  cover?: boolean;
}

export function SkeletonGrid({ count = 6, columns = 3, cover = true }: SkeletonGridProps) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      aria-label="Carregando conteúdo"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} cover={cover} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border" role="status" aria-label="Carregando tabela">
      <div className="grid gap-px bg-border" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`h-${i}`} className="bg-surface p-3">
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
        {Array.from({ length: rows * columns }).map((_, i) => (
          <div key={`c-${i}`} className="bg-bg p-3">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
