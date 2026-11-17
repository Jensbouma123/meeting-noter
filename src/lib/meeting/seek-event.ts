export const SEEK_EVENT = 'mn:seek';

export function requestSeek(seconds: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<number>(SEEK_EVENT, { detail: seconds }));
}

export const REVEAL_EVENT = 'mn:reveal-segment';

export function requestReveal(segmentId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(REVEAL_EVENT, { detail: segmentId }));
}
