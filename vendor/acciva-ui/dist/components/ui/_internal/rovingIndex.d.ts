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
/**
 * The index a roving-focus key lands on, or `null` when the key is not a
 * navigation key (or nothing is reachable). Pure: callers focus, click or scroll.
 */
export declare function rovingIndex(options: RovingIndexOptions): number | null;
/** Index of the next label starting with `buffer`, searching after `current` and wrapping. */
export declare function typeaheadIndex(labels: readonly string[], current: number, buffer: string): number | null;
