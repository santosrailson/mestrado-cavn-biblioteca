import { useCallback } from 'react';
import { useToastStore, ToastVariant } from '@/shared/stores/toastStore';

export function useToast() {
  const add = useToastStore((s) => s.add);
  const toast = useCallback(
    (message: string, type: ToastVariant = 'info') => {
      add(message, type);
    },
    [add]
  );
  return { toast };
}
