'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastKind = 'default' | 'success' | 'error';
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  showToast: (message: string, kind?: ToastKind) => void;
}>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'default' ? '' : t.kind}`}>
          {t.message}
        </div>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
