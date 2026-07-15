import { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { Loading } from './Loading';

type FeedbackStateProps = {
  state: 'loading' | 'error' | 'empty' | 'success';
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
};

/** Primitive único para estados assíncronos de páginas e componentes. */
export function FeedbackState({ state, title, message, onRetry, action }: FeedbackStateProps) {
  if (state === 'loading') return <Loading message={message} />;
  if (state === 'error') return <ErrorMessage title={title} message={message} onRetry={onRetry} />;
  if (state === 'empty') return <EmptyState title={title} description={message} action={action} />;

  return (
    <div
      className="rounded-lg border border-success-border bg-success-bg p-5 text-center"
      role="status"
    >
      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" aria-hidden="true" />
      {title && <h3 className="font-semibold text-success-text">{title}</h3>}
      {message && <p className="mt-1 text-sm text-success-text">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
