export type RovingOrientation = "horizontal" | "vertical" | "both";

export interface RovingIndexOptions {
  key: string;
  current: number;
  count: number;
  /** Which arrows move: `horizontal` Left/Right, `vertical` Up/Down, `both` all four. */
  orientation: RovingOrientation;
  /** Wrap past either end (radios, tabs) instead of clamping (lists, grids). */
  wrap?: boolean;
  /** Grid: Up/Down move by a row of this many cells (only with `both`). Default 1. */
  columns?: number;
  /** PageUp/PageDown step; omit to ignore those keys. */
  page?: number;
  isDisabled?: (index: number) => boolean;
}

/** First enabled index from `from` going `step`, or -1. */
function scan(from: number, step: number, count: number, isDisabled?: (i: number) => boolean) {
  for (let i = from; i >= 0 && i < count; i += step) if (!isDisabled?.(i)) return i;
  return -1;
}

function wrapStep(current: number, step: number, count: number, isDisabled?: (i: number) => boolean) {
  for (let n = 1; n <= count; n += 1) {
    const i = (((current + step * n) % count) + count) % count;
    if (!isDisabled?.(i)) return i;
  }
  return -1;
}

function clampStep(current: number, delta: number, count: number, isDisabled?: (i: number) => boolean) {
  const target = Math.max(0, Math.min(current + delta, count - 1));
  const dir = delta > 0 ? 1 : -1;
  const hit = scan(target, dir, count, isDisabled);
  return hit === -1 ? scan(target, -dir, count, isDisabled) : hit;
}

/** Signed step for a key under an orientation, or 0 when the key does not move. */
function deltaFor({ key, orientation, columns = 1, page }: RovingIndexOptions) {
  const h = orientation !== "vertical";
  const v = orientation !== "horizontal";
  const row = orientation === "both" ? columns : 1;
  if (h && key === "ArrowRight") return 1;
  if (h && key === "ArrowLeft") return -1;
  if (v && key === "ArrowDown") return row;
  if (v && key === "ArrowUp") return -row;
  if (page && key === "PageDown") return page;
  if (page && key === "PageUp") return -page;
  return 0;
}

/**
 * The index a roving-focus key lands on, or `null` when the key is not a
 * navigation key (or nothing is reachable). Pure: callers focus, click or scroll.
 */
export function rovingIndex(options: RovingIndexOptions): number | null {
  const { key, current, count, wrap = false, isDisabled } = options;
  if (count <= 0) return null;
  if (key === "Home") return emptyToNull(scan(0, 1, count, isDisabled));
  if (key === "End") return emptyToNull(scan(count - 1, -1, count, isDisabled));
  const delta = deltaFor(options);
  if (delta === 0) return null;
  const arrow = key.startsWith("Arrow");
  const next =
    wrap && arrow && Math.abs(delta) === 1
      ? wrapStep(current, delta, count, isDisabled)
      : clampStep(current, delta, count, isDisabled);
  return emptyToNull(next);
}

const emptyToNull = (index: number) => (index === -1 ? null : index);

/** Index of the next label starting with `buffer`, searching after `current` and wrapping. */
export function typeaheadIndex(labels: readonly string[], current: number, buffer: string): number | null {
  const needle = buffer.toLowerCase();
  const start = buffer.length > 1 ? current : current + 1;
  for (let n = 0; n < labels.length; n += 1) {
    const i = (start + n) % labels.length;
    if (labels[i].toLowerCase().startsWith(needle)) return i;
  }
  return null;
}
