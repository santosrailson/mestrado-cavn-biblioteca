import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('retorna o valor inicial imediatamente', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('atualiza o valor após o delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('b');
    vi.useRealTimers();
  });
});
