import { useMemo, useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string) {
  return (onStoreChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", onStoreChange);
    return () => list.removeEventListener("change", onStoreChange);
  };
}

/** Mobile-first: the server snapshot is the card layout, so hydration never widens a row. */
export function useIsWideViewport(query: string): boolean {
  const subscribe = useMemo(() => subscribeToMediaQuery(query), [query]);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
