import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image as ImageIcon, Calendar, Clock } from 'lucide-react';
import { Arquivo, Documento } from '@/shared/types';
import { EditButton } from '@/features/admin/components/EditButton';
import { getTipoDocumentoLabel } from '@/shared/lib/documentLabels';
import { getImageFallbackState, isGeneratedSeedCover, LOGO_FALLBACK } from '@/shared/lib/imageFallback';
import { CARD_IMAGE_SIZES } from '@/shared/lib/imageSrcSet';
import { format } from 'date-fns';
import { ptBR as ptBRLocale } from 'date-fns/locale';

interface DocumentCardProps {
  documento: Documento;
  highlight?: string;
  editTo?: string;
  onEdit?: (id: string) => void;
}

export function DocumentCard({ documento, highlight, editTo, onEdit }: DocumentCardProps) {
  const rawThumbnail = getDocumentThumbnail(documento);

  const fallback = getImageFallbackState(rawThumbnail);
  const [imgSrc, setImgSrc] = useState<string>(fallback.imageSrc);
  const [isLogo, setIsLogo] = useState(fallback.isFallback);

  useEffect(() => {
    const nextFallback = getImageFallbackState(rawThumbnail);
    setImgSrc(nextFallback.imageSrc);
    setIsLogo(nextFallback.isFallback);
  }, [rawThumbnail]);

  const isImage = documento.tipoDocumento === 'fotografia';

  const titleWithHighlight = highlight
    ? highlightTerm(documento.titulo, highlight)
    : documento.titulo;

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden p-0">
      {editTo && onEdit && (
        <div className="absolute right-2 top-2 z-10">
          <EditButton onClick={() => onEdit(editTo)} label="Editar" />
        </div>
      )}
      <Link
        to={`/documentos/${documento.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <img
          src={imgSrc}
          alt={isImage ? `Fotografia: ${documento.titulo}` : `Documento: ${documento.titulo}`}
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
          {getTipoDocumentoLabel(documento.tipoDocumento)}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 line-clamp-2 text-base font-semibold text-text transition-colors group-hover:text-primary">
          <Link to={`/documentos/${documento.slug}`} className="no-underline">
            {titleWithHighlight}
          </Link>
        </h3>
        {documento.resumo ? (
          <p className="mb-3 line-clamp-2 text-sm text-text-muted">{documento.resumo}</p>
        ) : (
          <div className="mb-3 flex-1" />
        )}
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3 text-xs text-text-muted">
          <div className="flex items-center justify-between gap-2">
            {documento.dataDocumento ? (
              <time dateTime={documento.dataDocumento} className="flex items-center gap-1" title="Data do documento">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                {format(new Date(documento.dataDocumento), 'dd/MM/yyyy', { locale: ptBRLocale })}
              </time>
            ) : (
              <span>Sem data</span>
            )}
            {documento.codigoReferencia && (
              <span className="font-mono">{documento.codigoReferencia}</span>
            )}
          </div>
          {documento.createdAt && (
            <time dateTime={documento.createdAt} className="flex items-center gap-1" title="Data de publicação">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Publicado em {format(new Date(documento.createdAt), 'dd/MM/yyyy', { locale: ptBRLocale })}
            </time>
          )}
        </div>
      </div>
    </article>
  );
}


function getDocumentThumbnail(documento: Documento) {
  const capa = isGeneratedSeedCover(documento.capa) ? null : documento.capa;
  const arquivos = documento.arquivos?.filter((arquivo) => !isGeneratedSeedCover(arquivo)) || [];
  const thumbnail = arquivos.find((arquivo) => arquivo.tipoArquivo === 'thumbnail');
  const firstImage = arquivos.find((arquivo) => isDisplayableImage(arquivo));
  const firstFile = arquivos[0];

  return capa?.url || thumbnail?.url || firstImage?.url || firstFile?.thumbnailUrl || firstFile?.url || null;
}

function isDisplayableImage(arquivo: Arquivo) {
  return arquivo.mimeType?.startsWith('image/') || Boolean(arquivo.thumbnailUrl);
}

function highlightTerm(text: string, term: string) {
  if (!text || !term) return text || null;
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safeTerm})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-focus/40 text-text">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
