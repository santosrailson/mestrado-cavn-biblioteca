import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';
import { useOptionalLocale } from '@/shared/i18n';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const { t } = useOptionalLocale();
  return (
    <nav aria-label={t.accessibility.breadcrumb} className={clsx('py-3', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--color-text-muted)]">
        <li>
          <Link to="/" className="flex items-center gap-1 hover:text-brand-700 no-underline">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t.navigation.home}</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            {item.to && index < items.length - 1 ? (
              <Link to={item.to} className="hover:text-brand-700 no-underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-[var(--color-text)]">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
