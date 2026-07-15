import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { useOptionalLocale } from '@/shared/i18n';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const { t } = useOptionalLocale();
  const resolvedTitle = title ?? t.common.emptyTitle;
  const resolvedDescription = description ?? t.common.emptyDescription;
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 text-center',
        className
      )}
      role="status"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon || <Inbox className="h-8 w-8" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold text-text">{resolvedTitle}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{resolvedDescription}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
