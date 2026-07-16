import { useOptionalLocale } from '@/shared/i18n';

export function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useOptionalLocale();

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <p className="text-5xl">⚠️</p>
      <h1 className="text-2xl font-bold text-text">{t.common.error}</h1>
      <p className="max-w-md text-text-muted">{t.common.unexpectedError}</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">
          {t.common.reloadPage}
        </button>
        <a href="/" className="btn-outline">
          {t.common.backToHome}
        </a>
      </div>
      {import.meta.env.DEV && (
        <details className="mt-4 max-w-2xl text-left">
          <summary className="cursor-pointer text-sm text-text-muted">
            {t.common.errorDetails}
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-surface p-4 text-xs text-red-600">
            {error?.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
