import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { useOptionalLocale } from '@/shared/i18n';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title, message, onRetry }: ErrorMessageProps) {
  const { t } = useOptionalLocale();
  const resolvedTitle = title ?? t.common.error;
  const resolvedMessage = message ?? 'Não foi possível carregar os dados. Tente novamente.';
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-600" aria-hidden="true" />
      <h3 className="mb-1 text-base font-semibold text-red-900">{resolvedTitle}</h3>
      <p className="mb-4 text-sm text-red-700">{resolvedMessage}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}
