import { Helmet } from 'react-helmet-async';
import { useOptionalLocale } from '@/shared/i18n';
import { useSiteConfig } from '@/shared/hooks/useSystemConfig';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  pathname?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';

export function SEO({
  title,
  description,
  image,
  imageAlt,
  pathname = '',
  type = 'website',
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const { titulo, descricao } = useSiteConfig();
  const { locale, t } = useOptionalLocale();
  const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
  const siteName = titulo || t.common.siteName;
  const fullTitle = title ? `${title} | ${siteName}` : titulo || t.seo.defaultTitle;
  const metaDescription = description || descricao || t.seo.defaultDescription;
  const url = `${siteUrl}${pathname}`;
  const ogImage = image || `${siteUrl}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={locale === 'en-US' ? 'en_US' : 'pt_BR'} />
      <meta property="og:site_name" content={siteName} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content={OG_IMAGE_WIDTH} />}
      {ogImage && <meta property="og:image:height" content={OG_IMAGE_HEIGHT} />}
      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
    </Helmet>
  );
}
