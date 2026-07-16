import { useOptionalLocale } from '@/shared/i18n';

export function SkipLink() {
  const { t } = useOptionalLocale();
  return (
    <a
      href="#main-content"
      className="sr-only-focusable fixed left-4 top-4 z-50 rounded bg-brand-700 px-4 py-2 text-white shadow-lg focus:not-sr-only"
    >
      {t.accessibility.skipToContent}
    </a>
  );
}
