import { TRANSITION_DURATION_MS } from "@/components/ui/Drawer/constants";

/** The panel's real transition length, read from the token the CSS actually uses.
 *  `--motion-spatial` is 180ms on a fine pointer, 260ms under `(pointer: coarse)` and
 *  0ms under `prefers-reduced-motion`, so a hardcoded constant unmounted the sheet
 *  mid-flight on touch. Reading the token keeps the timer and the transition in step. */
export function exitDurationMs(): number {
  if (typeof window === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--motion-spatial")
    .trim();
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || 0;
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || 0) * 1000;
  return TRANSITION_DURATION_MS;
}
