import { type RefObject } from "react";
/**
 * With `hug`, the visible heights (px) of each snap: `Drawer`'s `resolveDetentSizes` fed the
 * measured handle + peek row as the peek and the content-hugged panel (already capped by
 * `max-h-bottom-nav-drawer`) as the max. `full` is the panel; `half` is half of it.
 */
export declare function useHugSizes(enabled: boolean, panelRef: RefObject<HTMLElement | null>, headerRef: RefObject<HTMLElement | null>): {
    peek: number;
    half: number;
    full: number;
};
