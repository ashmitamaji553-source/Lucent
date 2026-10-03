'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styles from './ToastProvider.module.css';

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setVisible(false), 2200);
    setTimer(t);
  }, [timer]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`${styles.toast} ${visible ? styles.show : ''}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
