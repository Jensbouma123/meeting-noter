const STORAGE_KEY = 'capture-debug';
const CHANGE_EVENT = 'capture-debug-change';

export function captureDebugEnabled(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === 'capture') return true;
    if (param === 'off') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setCaptureDebug(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
    const url = new URL(window.location.href);
    if (url.searchParams.has('debug')) {
      url.searchParams.delete('debug');
      window.history.replaceState(null, '', url);
    }
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeCaptureDebug(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

export function persistDebugParamFromUrl(): void {
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === 'capture') window.localStorage.setItem(STORAGE_KEY, '1');
    if (param === 'off') window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
