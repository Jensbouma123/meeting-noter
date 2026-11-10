import type { BottomNavDrawerSnap } from "./types.js";
interface SnapStateOptions {
    snap?: BottomNavDrawerSnap;
    defaultSnap?: BottomNavDrawerSnap;
    open?: boolean;
    defaultOpen: boolean;
    halfDetent: boolean;
    onOpenChange?: (open: boolean) => void;
    onSnapChange?: (snap: BottomNavDrawerSnap, height: number) => void;
    /** Settled panel height in px for a snap (see `snapHeight`). */
    heightOf: (snap: BottomNavDrawerSnap) => number;
}
/** Snap order for the current shape; the index is what drag and the arrow keys step through. */
export declare function snapOrder(halfDetent: boolean): BottomNavDrawerSnap[];
/**
 * Controlled/uncontrolled snap. Precedence: `snap`, then `open`, then the internal snap
 * (from `defaultSnap`, else `defaultOpen`). The internal snap remembers `half` vs `full`; a
 * controlled `open` only decides whether it is collapsed, and `open={true}` from `peek` lands
 * on the first open snap (`half` with `halfDetent`, else `full`). `half` without `halfDetent`
 * clamps to `full`.
 */
export declare function useSnapState({ snap: snapProp, defaultSnap, open, defaultOpen, halfDetent, onOpenChange, onSnapChange, heightOf }: SnapStateOptions): {
    snap: BottomNavDrawerSnap;
    order: BottomNavDrawerSnap[];
    setSnap: (next: BottomNavDrawerSnap) => void;
};
export {};
