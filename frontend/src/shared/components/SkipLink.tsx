import ptBR from '@/shared/i18n/pt-BR';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only-focusable fixed left-4 top-4 z-50 rounded bg-brand-700 px-4 py-2 text-white shadow-lg focus:not-sr-only"
    >
      {ptBR.accessibility.skipToContent}
    </a>
  );
}
