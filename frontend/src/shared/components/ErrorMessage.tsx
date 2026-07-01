import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import ptBR from '@/shared/i18n/pt-BR';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = ptBR.common.error,
  message = 'Não foi possível carregar os dados. Tente novamente.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-600" aria-hidden="true" />
      <h3 className="mb-1 text-base font-semibold text-red-900">{title}</h3>
      <p className="mb-4 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {ptBR.common.retry}
        </Button>
      )}
    </div>
  );
}
