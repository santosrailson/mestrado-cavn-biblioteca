import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { useLocale } from '@/shared/i18n';

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <>
      <SEO title={t.common.notFound} />
      <main
        id="main-content"
        className="container-page flex min-h-[70vh] items-center justify-center py-12"
      >
        <Card className="max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
              404
            </div>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-text">{t.common.notFound}</h1>
          <p className="mb-6 text-text-muted">{t.common.unexpectedError}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="primary" asChild>
              <Link to="/" className="inline-flex items-center justify-center gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                {t.common.backToHome}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/busca" className="inline-flex items-center justify-center gap-2">
                <Search className="h-4 w-4" aria-hidden="true" />
                {t.notFound.searchCollection}
              </Link>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t.notFound.backPrevious}
          </button>
        </Card>
      </main>
    </>
  );
}
