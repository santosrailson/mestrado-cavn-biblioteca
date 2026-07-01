import ptBR from '@/shared/i18n/pt-BR';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = ptBR.common.loading, fullScreen = false }: LoadingProps) {
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
      <span className="text-sm text-[var(--color-text-muted)]">{message}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>;
  }

  return <div className="py-8">{content}</div>;
}
