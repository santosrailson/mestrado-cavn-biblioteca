import { useState, useEffect } from 'react';
import { useOptionalLocale } from '@/shared/i18n';

export function PWAUpdatePrompt() {
  const { t } = useOptionalLocale();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setNeedRefresh(false);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-primary bg-surface p-4 shadow-lg"
      role="alert"
    >
      <p className="text-sm text-text">{t.pwa.updateAvailable}</p>
      <button type="button" onClick={handleUpdate} className="btn-primary text-xs">
        {t.pwa.update}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 text-sm text-text-muted hover:text-text"
        aria-label={t.common.close}
      >
        ✕
      </button>
    </div>
  );
}
