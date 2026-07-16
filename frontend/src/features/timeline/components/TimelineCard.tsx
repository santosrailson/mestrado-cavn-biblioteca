import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { formatTimelineDate } from '@/shared/lib/formatDate';
import { getImageFallbackState, LOGO_FALLBACK } from '@/shared/lib/imageFallback';
import { useOptionalLocale } from '@/shared/i18n';
import { TimelineEvent } from '@/shared/types';

interface TimelineCardProps {
  event: TimelineEvent;
  showImage?: boolean;
  showDocumentLink?: boolean;
  className?: string;
}

export function TimelineCard({
  event,
  showImage = false,
  showDocumentLink = true,
  className = '',
}: TimelineCardProps) {
  const { t } = useOptionalLocale();
  const fallback = getImageFallbackState(event.imagemDestaque);
  const [imgSrc, setImgSrc] = useState(fallback.imageSrc);
  const [isLogo, setIsLogo] = useState(fallback.isFallback);

  useEffect(() => {
    const nextFallback = getImageFallbackState(event.imagemDestaque);
    setImgSrc(nextFallback.imageSrc);
    setIsLogo(nextFallback.isFallback);
  }, [event.imagemDestaque]);

  return (
    <Card className={`flex h-full flex-col ${className}`}>
      {showImage && (event.imagemDestaque || true) && (
        <img
          src={imgSrc}
          alt={event.titulo}
          className={
            isLogo
              ? 'mb-3 h-40 w-full rounded bg-white object-contain p-4 opacity-90'
              : 'mb-3 h-40 w-full rounded object-cover'
          }
          loading="lazy"
          onError={() => {
            if (imgSrc === LOGO_FALLBACK) return;
            setImgSrc(LOGO_FALLBACK);
            setIsLogo(true);
          }}
        />
      )}
      <div className="flex flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <time dateTime={event.dataEvento}>
            {formatTimelineDate(event.dataEvento, event.dataPrecisao)}
          </time>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-text">{event.titulo}</h3>
        {event.descricao ? (
          <p className="mb-3 line-clamp-3 flex-1 text-sm text-[var(--color-text-muted)]">
            {event.descricao}
          </p>
        ) : (
          <div className="flex-1" />
        )}
        {showDocumentLink && event.documento && (
          <Link
            to={`/documentos/${event.documento.slug}`}
            className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary no-underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t.timeline.viewDocument}
          </Link>
        )}
      </div>
    </Card>
  );
}
