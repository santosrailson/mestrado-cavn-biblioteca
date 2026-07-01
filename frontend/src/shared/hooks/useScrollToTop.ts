import { useLayoutEffect } from 'react';

/**
 * Rola a janela para o topo quando o componente é montado.
 *
 * Útil como complemento ao ScrollRestoration do React Router,
 * garantindo que páginas específicas sempre iniciem no topo,
 * mesmo em navegadores ou situações onde a restauração automática
 * não funciona perfeitamente.
 */
export function useScrollToTop() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const originalBehavior = getComputedStyle(html).scrollBehavior;

    // Desativa scroll-behavior smooth temporariamente para forçar scroll instantâneo
    html.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';

    window.scrollTo(0, 0);
    html.scrollTop = 0;
    document.body.scrollTop = 0;

    const timer = setTimeout(() => {
      html.style.scrollBehavior = originalBehavior;
      document.body.style.scrollBehavior = originalBehavior;
    }, 0);

    return () => clearTimeout(timer);
  }, []);
}
