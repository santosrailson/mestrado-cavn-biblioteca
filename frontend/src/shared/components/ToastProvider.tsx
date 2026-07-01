import { useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { ToastContext, ToastType } from '@/shared/contexts/ToastContext';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed right-4 top-4 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg animate-slide-up',
              t.type === 'success' && 'bg-green-600',
              t.type === 'error' && 'bg-red-600',
              t.type === 'info' && 'bg-brand-600'
            )}
            role="status"
          >
            {t.type === 'success' && <CheckCircle className="h-4 w-4" aria-hidden="true" />}
            {t.type === 'error' && <AlertCircle className="h-4 w-4" aria-hidden="true" />}
            {t.type === 'info' && <Info className="h-4 w-4" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
