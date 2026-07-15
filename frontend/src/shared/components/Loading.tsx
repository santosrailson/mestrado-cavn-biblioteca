import { useOptionalLocale } from '@/shared/i18n';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = false }: LoadingProps) {
  const { t } = useOptionalLocale();
  const resolvedMessage = message ?? t.common.loading;
  const content = (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
        aria-hidden="true"
      />
      <span className="text-sm text-[var(--color-text-muted)]">{resolvedMessage}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>;
  }

  return <div className="py-8">{content}</div>;
}
