import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { DocumentoRelacionado, TipoRelacao } from '@/shared/types';
import {
  getImageFallbackState,
  isGeneratedSeedCoverUrl,
  LOGO_FALLBACK,
} from '@/shared/lib/imageFallback';
import { CARD_IMAGE_SIZES } from '@/shared/lib/imageSrcSet';
import { useLocale } from '@/shared/i18n';

interface RelatedDocumentCardProps {
  documento: DocumentoRelacionado;
}

export function RelatedDocumentCard({ documento }: RelatedDocumentCardProps) {
  const { t } = useLocale();
  const rawThumbnail = isGeneratedSeedCoverUrl(documento.thumbnailUrl)
    ? null
    : documento.thumbnailUrl || null;
  const fallback = getImageFallbackState(rawThumbnail);
  const [imgSrc, setImgSrc] = useState(fallback.imageSrc);
  const [isLogo, setIsLogo] = useState(fallback.isFallback);
  const isImage = documento.tipoRelacao === 'parte_de';

  useEffect(() => {
    const nextFallback = getImageFallbackState(rawThumbnail);
    setImgSrc(nextFallback.imageSrc);
    setIsLogo(nextFallback.isFallback);
  }, [rawThumbnail]);

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden p-0">
      <Link
        to={`/documentos/${documento.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <img
          src={imgSrc}
          alt={t.document.relatedImageAlt.replace('{title}', documento.titulo)}
          className={
            isLogo
              ? 'h-full w-full bg-white object-contain p-8 opacity-90 transition-opacity duration-300 group-hover:opacity-100'
              : 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
          }
          loading="lazy"
          decoding="async"
          sizes={CARD_IMAGE_SIZES}
          onError={() => {
            if (imgSrc === LOGO_FALLBACK) return;
            setImgSrc(LOGO_FALLBACK);
            setIsLogo(true);
          }}
        />
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-primary-contrast backdrop-blur-sm">
          {isImage ? (
            <ImageIcon className="h-3 w-3" aria-hidden="true" />
          ) : (
            <FileText className="h-3 w-3" aria-hidden="true" />
          )}
          {t.document.relations[documento.tipoRelacao as TipoRelacao]}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-text transition-colors group-hover:text-primary">
          <Link to={`/documentos/${documento.slug}`} className="no-underline">
            {documento.titulo}
          </Link>
        </h3>
      </div>
    </article>
  );
}
