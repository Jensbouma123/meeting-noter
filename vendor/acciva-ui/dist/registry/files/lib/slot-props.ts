type Props = Record<string, unknown>;
type Handler = (event: { defaultPrevented?: boolean }, ...rest: unknown[]) => void;

const isHandler = (key: string, a: unknown, b: unknown) =>
  /^on[A-Z]/.test(key) && typeof a === "function" && typeof b === "function";

/**
 * Props a Slot-style `asChild` component merges onto its child. A handler present on both
 * runs the child's first, then the slot's unless the child called `preventDefault()`, so the
 * child's own `onClick` is composed with, never replaced.
 */
export function composeSlotProps(child: Props, slot: Props): Props {
  const merged: Props = { ...slot };
  for (const key of Object.keys(slot)) {
    if (!isHandler(key, child[key], slot[key])) continue;
    merged[key] = (event: { defaultPrevented?: boolean }, ...rest: unknown[]) => {
      (child[key] as Handler)(event, ...rest);
      if (!event?.defaultPrevented) (slot[key] as Handler)(event, ...rest);
    };
  }
  return merged;
}
