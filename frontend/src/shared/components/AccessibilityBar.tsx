import { useEffect, useState } from 'react';
import { Contrast, ZoomIn, ZoomOut, Type, Moon, Sun } from 'lucide-react';
import { useLocale } from '@/shared/i18n';

type ColorTheme = 'default' | 'dark' | 'high-contrast';

const MIN_SCALE = 100;
const MAX_SCALE = 200;
const STEP = 10;

export function AccessibilityBar() {
  const { locale, setLocale, t } = useLocale();
  const [scale, setScale] = useState(100);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('default');

  useEffect(() => {
    const savedScale = localStorage.getItem('cavn:font-scale');
    const savedTheme = localStorage.getItem('cavn:theme') as ColorTheme | null;
    if (savedScale) {
      const parsed = parseInt(savedScale, 10);
      if (!Number.isNaN(parsed)) {
        setScale(Math.min(Math.max(parsed, MIN_SCALE), MAX_SCALE));
      }
    }
    if (savedTheme) setColorTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    localStorage.setItem('cavn:font-scale', String(scale));
  }, [scale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    localStorage.setItem('cavn:theme', colorTheme);
  }, [colorTheme]);

  const increaseFont = () => setScale((prev) => Math.min(prev + STEP, MAX_SCALE));
  const decreaseFont = () => setScale((prev) => Math.max(prev - STEP, MIN_SCALE));

  const toggleDark = () => setColorTheme((prev) => (prev === 'dark' ? 'default' : 'dark'));

  const toggleContrast = () =>
    setColorTheme((prev) => (prev === 'high-contrast' ? 'default' : 'high-contrast'));

  return (
    <div
      className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1 text-xs"
      role="region"
      aria-label={t.accessibility.accessibility}
    >
      <Type className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t.accessibility.fontSize}</span>
      <span aria-live="polite" className="hidden min-w-[3.5rem] sm:inline">
        {scale}%
      </span>
      <button
        type="button"
        onClick={decreaseFont}
        disabled={scale === MIN_SCALE}
        className="rounded p-1 hover:bg-[var(--color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:opacity-40"
        aria-label={t.accessibility.decreaseFont}
      >
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={increaseFont}
        disabled={scale === MAX_SCALE}
        className="rounded p-1 hover:bg-[var(--color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:opacity-40"
        aria-label={t.accessibility.increaseFont}
      >
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="mx-2 h-4 w-px bg-[var(--color-border)]" />

      <button
        type="button"
        onClick={toggleDark}
        className="flex items-center gap-1 rounded p-1 hover:bg-[var(--color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        aria-pressed={colorTheme === 'dark'}
        aria-label={colorTheme === 'dark' ? t.accessibility.lightMode : t.accessibility.darkMode}
      >
        {colorTheme === 'dark' ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">
          {colorTheme === 'dark' ? t.accessibility.lightMode : t.accessibility.darkMode}
        </span>
      </button>

      <label className="ml-auto flex items-center gap-1" htmlFor="language-selector">
        <span className="sr-only">{t.accessibility.language}</span>
        <select
          id="language-selector"
          value={locale}
          onChange={(event) => setLocale(event.target.value as 'pt-BR' | 'en-US')}
          className="rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
          aria-label={t.accessibility.language}
        >
          <option value="pt-BR">PT</option>
          <option value="en-US">EN</option>
        </select>
      </label>

      <button
        type="button"
        onClick={toggleContrast}
        className="flex items-center gap-1 rounded p-1 hover:bg-[var(--color-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        aria-pressed={colorTheme === 'high-contrast'}
        aria-label={
          colorTheme === 'high-contrast'
            ? t.accessibility.normalContrast
            : t.accessibility.highContrast
        }
      >
        <Contrast className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">
          {colorTheme === 'high-contrast'
            ? t.accessibility.normalContrast
            : t.accessibility.highContrast}
        </span>
      </button>
    </div>
  );
}
