import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from '../components/ui';

type ToastType = 'success' | 'error' | 'info';

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);

  const show = useCallback((type: ToastType) => (message: string) => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const close = useCallback(() => setToast(null), []);

  const api = useMemo<ToastApi>(
    () => ({ success: show('success'), error: show('error'), info: show('info') }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={close} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return ctx;
}
