import { WifiOff } from 'lucide-react';
import ptBR from '@/shared/i18n/pt-BR';

export function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="h-16 w-16 text-text-muted" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-text">
        {ptBR.offline.title}
      </h1>
      <p className="max-w-md text-text-muted">
        {ptBR.offline.description}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-primary mt-4"
      >
        {ptBR.offline.retry}
      </button>
    </div>
  );
}
