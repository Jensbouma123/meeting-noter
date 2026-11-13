export const SEEK_EVENT = 'mn:seek';

export function requestSeek(seconds: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<number>(SEEK_EVENT, { detail: seconds }));
}
