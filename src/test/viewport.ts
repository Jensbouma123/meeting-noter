// Deterministic viewport harness for responsive tests.
// Stubs window.matchMedia so that (min-width)/(max-width) queries resolve against a fixed width.
// Other media features resolve to false. Call setViewport() to change the width and notify listeners.

export const VIEWPORTS = { phone: 400, tablet: 768, desktop: 1024 } as const;

type Listener = (event: { matches: boolean; media: string }) => void;

const feature = /\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g;

let width: number = VIEWPORTS.desktop;
const listeners = new Set<{ query: string; listener: Listener }>();

function matchesQuery(query: string, viewportWidth: number): boolean {
  const features = [...query.matchAll(feature)];
  if (features.length === 0) return false;
  return features.every(([, kind, px]) =>
    kind === 'min' ? viewportWidth >= Number(px) : viewportWidth <= Number(px),
  );
}

function createMediaQueryList(query: string) {
  return {
    get matches() {
      return matchesQuery(query, width);
    },
    media: query,
    onchange: null,
    addEventListener(_: string, listener: Listener) {
      listeners.add({ query, listener });
    },
    removeEventListener(_: string, listener: Listener) {
      for (const entry of listeners) if (entry.listener === listener) listeners.delete(entry);
    },
    addListener(listener: Listener) {
      listeners.add({ query, listener });
    },
    removeListener(listener: Listener) {
      for (const entry of listeners) if (entry.listener === listener) listeners.delete(entry);
    },
    dispatchEvent: () => false,
  };
}

/** Installs the viewport-aware matchMedia stub at the given width. Returns a restore function. */
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

/** Changes the viewport width and notifies every matching listener whose result flipped. */
export function setViewport(nextWidth: number): void {
  const before = [...listeners].map((entry) => matchesQuery(entry.query, width));
  width = nextWidth;
  [...listeners].forEach((entry, index) => {
    const now = matchesQuery(entry.query, width);
    if (now !== before[index]) entry.listener({ matches: now, media: entry.query });
  });
}
