import type { ViewportListener } from './viewport.types';

export const VIEWPORTS = { phone: 400, tablet: 768, desktop: 1024 } as const;

let width: number = VIEWPORTS.desktop;
const listeners = new Set<{ query: string; listener: ViewportListener }>();

const feature = /\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g;

function matchesQuery(query: string, viewportWidth: number): boolean {
  const features = [...query.matchAll(feature)];
  if (features.length === 0) return false;
  return features.every(([, kind, px]) =>
    kind === 'min' ? viewportWidth >= Number(px) : viewportWidth <= Number(px),
  );
}

function removeListener(listener: ViewportListener) {
  for (const entry of listeners) if (entry.listener === listener) listeners.delete(entry);
}

function createMediaQueryList(query: string) {
  return {
    get matches() {
      return matchesQuery(query, width);
    },
    media: query,
    onchange: null,
    addEventListener(_: string, listener: ViewportListener) {
      listeners.add({ query, listener });
    },
    removeEventListener(_: string, listener: ViewportListener) {
      removeListener(listener);
    },
    addListener(listener: ViewportListener) {
      listeners.add({ query, listener });
    },
    removeListener,
    dispatchEvent: () => false,
  };
}

export function installViewport(initialWidth: number = VIEWPORTS.desktop): () => void {
  const previous = window.matchMedia;
  width = initialWidth;
  listeners.clear();
  window.matchMedia = ((query: string) => createMediaQueryList(query)) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = previous;
    listeners.clear();
  };
}

export function setViewport(nextWidth: number): void {
  const before = [...listeners].map((entry) => matchesQuery(entry.query, width));
  width = nextWidth;
  [...listeners].forEach((entry, index) => {
    const now = matchesQuery(entry.query, width);
    if (now !== before[index]) entry.listener({ matches: now, media: entry.query });
  });
}
