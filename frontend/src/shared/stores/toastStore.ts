import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, variant?: ToastVariant, duration?: number) => void;
  remove: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add(message, variant = 'info', duration = 4000) {
    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }));
    if (duration > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration);
    }
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (msg: string, duration?: number) =>
    useToastStore.getState().add(msg, 'success', duration),
  error: (msg: string, duration?: number) => useToastStore.getState().add(msg, 'error', duration),
  warning: (msg: string, duration?: number) =>
    useToastStore.getState().add(msg, 'warning', duration),
  info: (msg: string, duration?: number) => useToastStore.getState().add(msg, 'info', duration),
};
