import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import ptBR from '@/shared/i18n/pt-BR';

export function AccessDeniedPage() {
  return (
    <main id="main-content" className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg text-danger">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-text">{ptBR.auth.accessDenied}</h1>
        <p className="mb-6 text-[var(--color-text-muted)]">{ptBR.auth.accessDeniedMessage}</p>
        <Link to="/" className="btn-primary inline-block no-underline">
          {ptBR.common.backToHome}
        </Link>
      </Card>
    </main>
  );
}
