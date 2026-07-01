import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'cavn:scroll-positions';

function savePositions(positions: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore storage errors
  }
}

function getPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function AppScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<Record<string, number>>(getPositions());
  const lastKeyRef = useRef<string>(location.key);

  // Salva a posição atual do scroll para o pathname atual.
  useEffect(() => {
    const handleScroll = () => {
      positionsRef.current[location.pathname] = window.scrollY;
      savePositions(positionsRef.current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Restaura posição ao voltar/avançar (POP) ou vai para o topo em cliques de link (PUSH/REPLACE).
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    lastKeyRef.current = location.key;

    if (navigationType === 'POP') {
      const savedY = positionsRef.current[location.pathname] ?? 0;
      window.scrollTo({ top: savedY, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location, navigationType]);

  return null;
}
