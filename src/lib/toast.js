// Simple client-side helper to show toasts via `window` events.
export default function showToast(message, type = 'info', timeout = 4500) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type, timeout } }));
  } catch (e) {
    // no-op in non-browser or if CustomEvent blocked
    // fallback: console log
    // eslint-disable-next-line no-console
    console.warn('showToast fallback:', message, type);
  }
}
