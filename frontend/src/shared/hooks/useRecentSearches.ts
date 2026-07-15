import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cavn:recent-searches';
const MAX_ITEMS = 6;

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved))
        setItems(saved.filter((item): item is string => typeof item === 'string'));
    } catch {
      setItems([]);
    }
  }, []);

  const add = useCallback((query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setItems((current) => {
      const next = [
        normalized,
        ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  return { items, add, clear };
}
