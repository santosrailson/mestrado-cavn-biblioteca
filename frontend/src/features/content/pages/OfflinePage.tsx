import { WifiOff } from 'lucide-react';
import { useLocale } from '@/shared/i18n';

export function OfflinePage() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="h-16 w-16 text-text-muted" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-text">{t.offline.title}</h1>
      <p className="max-w-md text-text-muted">{t.offline.description}</p>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-4">
        {t.offline.retry}
      </button>
    </div>
  );
}
