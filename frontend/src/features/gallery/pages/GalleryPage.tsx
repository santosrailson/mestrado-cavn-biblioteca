import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '@/shared/components/SEO';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Breadcrumb } from '@/shared/components/Breadcrumb';
import { EmptyState } from '@/shared/components/EmptyState';
import { Skeleton } from '@/shared/components/Skeleton';
import { Section, SectionHeader } from '@/shared/components/Section';
import { useAlbums, usePhotos } from '@/shared/hooks/useGallery';
import { useEditable } from '@/features/admin/hooks/useEditable';
import { CreateButton } from '@/features/admin/components/CreateButton';
import { EditButton } from '@/features/admin/components/EditButton';
import { AlbumFormModal } from '@/features/admin/components/AlbumFormModal';
import { PhotoFormModal } from '@/features/admin/components/PhotoFormModal';
import { Foto, Album } from '@/shared/types';
import { getImageFallbackSrc, LOGO_FALLBACK } from '@/shared/lib/imageFallback';
import { GALLERY_IMAGE_SIZES } from '@/shared/lib/imageSrcSet';
import { useLocale } from '@/shared/i18n';

export function GalleryPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const albumSlug = searchParams.get('album') || '';
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { canEdit } = useEditable();

  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Foto | null>(null);

  const {
    data: albums,
    isLoading: albumsLoading,
    error: albumsError,
    refetch: refetchAlbums,
  } = useAlbums();
  const {
    data: photos,
    isLoading: photosLoading,
    error: photosError,
    refetch: refetchPhotos,
  } = usePhotos();

  const currentAlbum = albums?.find((a) => a.slug === albumSlug);
  const displayedPhotos = currentAlbum?.fotos || photos || [];

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const nextPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev + 1) % displayedPhotos.length);
  }, [displayedPhotos.length]);

  const prevPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev - 1 + displayedPhotos.length) % displayedPhotos.length);
  }, [displayedPhotos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, nextPhoto, prevPhoto]);

  const openAlbumCreate = () => {
    setEditingAlbum(null);
    setAlbumModalOpen(true);
  };

  const openAlbumEdit = (album: Album) => {
    setEditingAlbum(album);
    setAlbumModalOpen(true);
  };

  const openPhotoCreate = () => {
    setEditingPhoto(null);
    setPhotoModalOpen(true);
  };

  const openPhotoEdit = (photo: Foto) => {
    setEditingPhoto(photo);
    setPhotoModalOpen(true);
  };

  return (
    <>
      <SEO title={t.gallery.title} />
      <main id="main-content">
        <Section ariaLabelledby="gallery-title">
          <Breadcrumb
            items={[
              { label: t.navigation.gallery, to: '/galeria' },
              ...(currentAlbum ? [{ label: currentAlbum.titulo }] : []),
            ]}
            className="mb-6"
          />

          <SectionHeader
            title={currentAlbum?.titulo || t.gallery.title}
            titleId="gallery-title"
            subtitle={currentAlbum?.descricao || t.gallery.subtitle}
            centered
            action={
              canEdit ? (
                <div className="flex gap-2">
                  <CreateButton onClick={openAlbumCreate} label={t.gallery.albums} />
                  <CreateButton onClick={openPhotoCreate} label={t.gallery.photos} />
                </div>
              ) : undefined
            }
          />

          {(albumsError || photosError) && (
            <ErrorMessage
              onRetry={() => {
                if (albumsError) refetchAlbums();
                if (photosError) refetchPhotos();
              }}
            />
          )}

          {/* Albums */}
          {!albumSlug && (
            <section className="mb-12" aria-labelledby="albums-title">
              <h2 id="albums-title" className="mb-5 text-xl font-semibold">
                {t.gallery.albums}
              </h2>

              {albumsLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video w-full" />
                  ))}
                </div>
              )}

              {!albumsLoading && albums && albums.length === 0 && (
                <EmptyState
                  title={t.gallery.emptyAlbums}
                  description={t.home.noCategoriesDescription}
                />
              )}

              {albums && albums.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {albums.map((album) => (
                    <div key={album.id} className="relative">
                      <Link
                        to={`/galeria?album=${album.slug}`}
                        className="group card block overflow-hidden p-0 no-underline transition-all hover:shadow-md"
                      >
                        <div className="relative aspect-video overflow-hidden bg-surface-alt">
                          <img
                            src={getImageFallbackSrc(album.capa || album.capaUrl)}
                            alt={t.gallery.albumCoverAlt.replace('{title}', album.titulo)}
                            className={
                              album.capa || album.capaUrl
                                ? 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                                : 'h-full w-full bg-white object-contain p-6 opacity-90 transition-opacity duration-300 group-hover:opacity-100'
                            }
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 1024px) 50vw, 25vw"
                            onError={(event) => {
                              event.currentTarget.src = LOGO_FALLBACK;
                              event.currentTarget.className =
                                'h-full w-full bg-white object-contain p-6 opacity-90 transition-opacity duration-300 group-hover:opacity-100';
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-text">{album.titulo}</h3>
                          {album.descricao && (
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                              {album.descricao}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                            {t.gallery.photoCount.replace(
                              '{count}',
                              String(album.fotos?.length ?? 0)
                            )}
                          </p>
                        </div>
                      </Link>
                      {canEdit && (
                        <div className="absolute right-2 top-2">
                          <EditButton onClick={() => openAlbumEdit(album)} label={t.admin.edit} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {albumSlug && currentAlbum && (
            <div className="mb-6 flex items-center justify-between">
              <Link to="/galeria" className="btn-outline text-sm no-underline">
                {t.gallery.albums}
              </Link>
            </div>
          )}

          {/* Photos */}
          <section aria-label={t.gallery.photos}>
            <h2 id="photos-title" className="mb-5 text-xl font-semibold">
              {t.gallery.photos}
            </h2>

            {photosLoading && (
              <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="mb-3 aspect-square w-full" />
                ))}
              </div>
            )}

            {!photosLoading && displayedPhotos.length === 0 && (
              <EmptyState
                title={t.gallery.emptyPhotos}
                description={t.home.noTimelineDescription}
              />
            )}

            {displayedPhotos.length > 0 && (
              <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
                {displayedPhotos.map((photo, index) => (
                  <div key={photo.id} className="relative mb-3 break-inside-avoid">
                    <button
                      type="button"
                      onClick={() => openLightbox(index)}
                      className="group relative w-full overflow-hidden rounded-lg bg-surface-alt text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label={t.gallery.enlargePhoto.replace(
                        '{title}',
                        photo.legenda || t.gallery.galleryPhotoAlt
                      )}
                    >
                      <img
                        src={getImageFallbackSrc(photo.imagemUrl)}
                        alt={photo.legenda || t.gallery.galleryPhotoAlt}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        sizes={GALLERY_IMAGE_SIZES}
                        onError={(event) => {
                          event.currentTarget.src = LOGO_FALLBACK;
                          event.currentTarget.className =
                            'w-full bg-white object-contain p-6 opacity-90 transition-opacity duration-300 group-hover:opacity-100';
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                        <p className="text-sm font-medium text-white">{photo.legenda}</p>
                      </div>
                    </button>
                    {canEdit && (
                      <div className="absolute right-2 top-2">
                        <EditButton onClick={() => openPhotoEdit(photo)} label={t.admin.edit} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </Section>

        {lightboxOpen && displayedPhotos.length > 0 && (
          <PhotoLightbox
            photo={displayedPhotos[currentPhotoIndex]}
            onClose={closeLightbox}
            onNext={nextPhoto}
            onPrev={prevPhoto}
            hasNext={displayedPhotos.length > 1}
          />
        )}
      </main>

      <AlbumFormModal
        isOpen={albumModalOpen}
        onClose={() => setAlbumModalOpen(false)}
        album={editingAlbum}
      />
      <PhotoFormModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photo={editingPhoto}
        defaultAlbumId={currentAlbum?.id}
      />
    </>
  );
}

interface PhotoLightboxProps {
  photo: Foto;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
}

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function PhotoLightbox({ photo, onClose, onNext, onPrev, hasNext }: PhotoLightboxProps) {
  const { t } = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS) ?? []
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.gallery.lightboxTitle}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={t.common.close}
      >
        <X className="h-6 w-6" aria-hidden="true" />
      </button>

      {hasNext && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t.common.previous}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t.common.next}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </>
      )}

      <div className="max-h-full max-w-5xl">
        <img
          src={getImageFallbackSrc(photo.imagemUrl)}
          alt={photo.legenda || t.gallery.galleryPhotoAlt}
          className="max-h-[80vh] w-auto rounded shadow-2xl"
          aria-describedby="lightbox-caption"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = LOGO_FALLBACK;
            event.currentTarget.className =
              'max-h-[80vh] w-auto rounded bg-white p-8 opacity-90 shadow-2xl';
          }}
        />
        <div
          id="lightbox-caption"
          className="mt-3 text-center text-white"
          aria-live="polite"
          aria-atomic="true"
        >
          <h3 className="text-lg font-semibold">{photo.legenda}</h3>
        </div>
      </div>
    </div>
  );
}
