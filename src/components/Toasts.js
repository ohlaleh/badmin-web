"use client";

import { useEffect, useState, useCallback } from "react";

let idCounter = 1;

// Helper function เพื่อให้เรียกใช้ได้ง่ายขึ้นจากไฟล์อื่น
export const showToast = (message, type = 'info', timeout = 4500) => {
  window.dispatchEvent(new CustomEvent('toast', { 
    detail: { message, type, timeout } 
  }));
};

export default function Toasts() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(s => s.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    function onToast(e) {
      const detail = (e && e.detail) || {};
      const id = idCounter++;
      const t = { 
        id, 
        message: detail.message || '', 
        type: detail.type || 'info', 
        timeout: detail.timeout ?? 4500 
      };
      
      setToasts(s => [t, ...s]);

      if (t.timeout > 0) {
        setTimeout(() => dismiss(id), t.timeout);
      }
    }

    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, [dismiss]);

  return (
    <div 
      aria-live="polite" 
      className="fixed top-20 right-4 z-[9999] flex flex-col items-end space-y-3 pointer-events-none"
    >
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`
            pointer-events-auto max-w-sm w-full p-4 rounded-2xl shadow-2xl border backdrop-blur-md
            transform-gpu transition-all duration-300 animate-in slide-in-from-right-8 fade-in
            ${t.type === 'success' 
              ? 'bg-emerald-500/90 border-emerald-400 text-white' 
              : t.type === 'error' 
                ? 'bg-rose-500/90 border-rose-400 text-white' 
                : 'bg-slate-800/90 border-slate-700 text-white'}
          `} 
          role="status"
        >
          <div className="flex items-center gap-3">
            {/* Icon แสดงสถานะ */}
            <div className="shrink-0">
              {t.type === 'success' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {t.type === 'error' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            <div className="flex-1 text-sm font-medium leading-snug font-sans">
              {t.message}
            </div>

            <button 
              onClick={() => dismiss(t.id)} 
              className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}