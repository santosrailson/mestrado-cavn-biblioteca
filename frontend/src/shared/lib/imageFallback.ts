export const LOGO_FALLBACK = '/logo-cavn.png';

type ImageCandidate = {
  url?: string | null;
  nomeOriginal?: string | null;
  nomeArmazenado?: string | null;
  tamanhoBytes?: number | null;
  largura?: number | null;
  altura?: number | null;
};

export function getImageFallbackSrc(src?: string | null) {
  return src && src.trim() ? src : LOGO_FALLBACK;
}

export function getImageFallbackState(src?: string | null) {
  const imageSrc = getImageFallbackSrc(src);
  return {
    imageSrc,
    isFallback: imageSrc === LOGO_FALLBACK,
  };
}


export function isGeneratedSeedCover(candidate?: ImageCandidate | null) {
  if (!candidate?.url) return false;

  const filename = getFilename(candidate.url) || candidate.nomeOriginal || candidate.nomeArmazenado || '';
  const hasSeedCoverName = /^capa-[a-z0-9-]+\.jpe?g$/i.test(filename);
  const hasSeedDimensions = candidate.largura === 800 && candidate.altura === 600;
  const hasSeedFileSize =
    typeof candidate.tamanhoBytes === 'number' &&
    candidate.tamanhoBytes >= 7000 &&
    candidate.tamanhoBytes <= 10000;

  return hasSeedCoverName && hasSeedDimensions && hasSeedFileSize;
}

export function isGeneratedSeedCoverUrl(src?: string | null) {
  if (!src) return false;

  const filename = getFilename(src);
  return /\/media\/documentos\/\d{4}\/\d{2}\//.test(src) && /^capa-[a-z0-9-]+\.jpe?g$/i.test(filename);
}

function getFilename(src: string) {
  try {
    return decodeURIComponent(src.split('?')[0].split('#')[0].split('/').pop() || '');
  } catch {
    return src.split('?')[0].split('#')[0].split('/').pop() || '';
  }
}
