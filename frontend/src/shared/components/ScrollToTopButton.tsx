import { useEffect, useState, RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useOptionalLocale } from '@/shared/i18n';

interface ScrollToTopButtonProps {
  threshold?: number;
  containerRef?: RefObject<HTMLElement>;
  className?: string;
}

export function ScrollToTopButton({
  threshold = 300,
  containerRef,
  className,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useOptionalLocale();

  useEffect(() => {
    const element = containerRef?.current;

    const getScrollTop = () => {
      if (element) return element.scrollTop;
      return window.scrollY;
    };

    const handleScroll = () => {
      setVisible(getScrollTop() > threshold);
    };

    handleScroll();

    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, containerRef]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={clsx(
        'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'hover:opacity-90 active:scale-95',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
        className
      )}
      aria-label={t.common.backToTop}
      aria-hidden={!visible}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
