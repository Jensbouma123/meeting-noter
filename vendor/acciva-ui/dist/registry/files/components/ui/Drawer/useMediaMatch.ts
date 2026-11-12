import { useEffect, useState } from "react";

/** `true` only while `active` and the media query matches. */
export function useMediaMatch(query: string, active: boolean): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(query);
    const sync = () => setMatches(mediaQuery.matches === true);
    sync();
    mediaQuery.addEventListener?.("change", sync);
    return () => mediaQuery.removeEventListener?.("change", sync);
  }, [active, query]);

  return active && matches;
}
