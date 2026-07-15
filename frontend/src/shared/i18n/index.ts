import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import ptBR from './pt-BR';
import type { Translation } from './pt-BR';
import { enUS } from './en-US';

export type { Translation } from './pt-BR';

export type Locale = 'pt-BR' | 'en-US';
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : unknown };

// Alguns componentes legados ainda importam ptBR diretamente. Mantemos esse
// objeto sincronizado para que a troca de idioma também alcance esses módulos,
// enquanto a migração gradual para useLocale() é concluída.
const portugueseBase = JSON.parse(JSON.stringify(ptBR)) as Translation;

function syncLegacyTranslations(next: Translation) {
  Object.assign(ptBR as unknown as Record<string, unknown>, next);
}

function mergeTranslations(base: Translation, override: DeepPartial<Translation>): Translation {
  const merge = (left: unknown, right: unknown): unknown => {
    if (right && typeof right === 'object' && !Array.isArray(right)) {
      const result: Record<string, unknown> = { ...(left as Record<string, unknown>) };
      Object.entries(right).forEach(([key, value]) => {
        result[key] = merge(result[key], value);
      });
      return result;
    }
    return right === undefined ? left : right;
  };

  return merge(base, override) as Translation;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translation;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('cavn:locale');
    return saved === 'en-US' ? 'en-US' : 'pt-BR';
  });

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem('cavn:locale', nextLocale);
    document.documentElement.lang = nextLocale;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(
    () => (locale === 'en-US' ? mergeTranslations(portugueseBase, enUS) : portugueseBase),
    [locale]
  );
  syncLegacyTranslations(t);
  return createElement(LocaleContext.Provider, { value: { locale, setLocale, t } }, children);
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale deve ser usado dentro de LocaleProvider');
  return context;
}

export function useOptionalLocale() {
  return (
    useContext(LocaleContext) ?? {
      locale: 'pt-BR' as Locale,
      setLocale: () => undefined,
      t: ptBR,
    }
  );
}
