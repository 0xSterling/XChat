import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastContextType = {
  show: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
    setTimeout(() => setMessage(null), 200);
  }, []);

  const show = useCallback((msg: string, durationMs = 2400) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(msg);
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      hide();
      timerRef.current = null;
    }, durationMs) as unknown as number;
  }, [hide]);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <div style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9999,
        }}>
          <div style={{
            maxWidth: 480,
            margin: '0 16px',
            padding: '10px 14px',
            background: 'rgba(17,17,17,0.9)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.3,
            opacity: visible ? 1 : 0,
            transform: `translateY(${visible ? 0 : 6}px)`,
            transition: 'opacity 150ms ease, transform 150ms ease',
            pointerEvents: 'auto',
          }}>
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

