import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore, Toast, ToastVariant } from '@/shared/stores/toastStore';
import { useOptionalLocale } from '@/shared/i18n';

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />,
  info: <Info className="h-5 w-5 shrink-0" aria-hidden="true" />,
};

const STYLES: Record<ToastVariant, string> = {
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success)]',
  error:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] border-[var(--color-danger-border)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-yellow-300',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const { t } = useOptionalLocale();

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'animate-fade-in max-w-sm w-full',
        STYLES[toast.variant]
      )}
    >
      {ICONS[toast.variant]}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="rounded p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label={t.common.closeNotification}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div aria-label="Notificações" className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
