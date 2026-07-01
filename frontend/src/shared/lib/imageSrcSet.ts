interface ImageVariant {
  url: string;
  width: number;
}

export function buildSrcSet(variants?: ImageVariant[] | null): string | undefined {
  if (!variants || variants.length === 0) return undefined;
  return variants.map((v) => `${v.url} ${v.width}w`).join(', ');
}

export const CARD_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

export const GALLERY_IMAGE_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
