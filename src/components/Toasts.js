"use client";

import { useEffect, useState } from "react";

let idCounter = 1;

export default function Toasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const detail = (e && e.detail) || {};
      const id = idCounter++;
      const t = { id, message: detail.message || '', type: detail.type || 'info', timeout: detail.timeout ?? 4500 };
      setToasts(s => [t, ...s]);
      if (t.timeout > 0) {
        setTimeout(() => {
          setToasts(s => s.filter(x => x.id !== id));
        }, t.timeout);
      }
    }

    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, []);

  function dismiss(id) {
    setToasts(s => s.filter(t => t.id !== id));
  }

  return (
    <div aria-live="polite" className="fixed top-28 right-4 z-9999 flex flex-col items-center space-y-2" style={{ zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow-lg transform-gpu transition-all duration-200 ${t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`} role="status">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm leading-tight">{t.message}</div>
            <button aria-label="close" onClick={() => dismiss(t.id)} className="text-white opacity-80 hover:opacity-100">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
