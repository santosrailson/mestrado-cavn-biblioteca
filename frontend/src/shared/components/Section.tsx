import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'alt' | 'brand';
  id?: string;
  ariaLabelledby?: string;
}

export function Section({
  children,
  className,
  variant = 'default',
  id,
  ariaLabelledby,
}: SectionProps) {
  const variants = {
    default: 'bg-[var(--color-bg)]',
    alt: 'bg-[var(--color-surface-alt)]',
    brand: 'bg-brand-900 text-white',
  };

  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={clsx('section', variants[variant], className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  titleId: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}

export function SectionHeader({
  title,
  titleId,
  subtitle,
  action,
  centered = false,
}: SectionHeaderProps) {
  if (centered) {
    return (
      <div className="relative mb-8 sm:mb-10">
        <div className="text-center">
          <h2 id={titleId} className="section-title">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-2xl text-[var(--color-text-muted)]">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="absolute right-0 top-0 flex items-center gap-2">{action}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx('mb-8 flex flex-col gap-2 sm:mb-10', {
        'sm:flex-row sm:items-end sm:justify-between': action,
      })}
    >
      <div>
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        {subtitle && <p className="mt-2 max-w-2xl text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
