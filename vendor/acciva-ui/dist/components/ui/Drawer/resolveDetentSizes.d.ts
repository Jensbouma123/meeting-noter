import type { DrawerAxis, DrawerDetent, DrawerLength, DrawerModality } from "./types.js";
export interface ResolveDetentSizesOptions {
    available: number;
    referenceEl: HTMLElement | null;
    axis: DrawerAxis;
    modality: DrawerModality;
    minSize?: DrawerLength;
    defaultSize?: DrawerLength;
    maxSize?: DrawerLength;
    autoContentSize?: number;
}
/**
 * Resolves the three detents to px along the drawer's growth axis. The result is always
 * monotonic (`peek <= half <= full`) so drag, keyboard and controlled detents agree.
 */
export declare function resolveDetentSizes({ available, referenceEl, axis, modality, minSize, defaultSize, maxSize, autoContentSize, }: ResolveDetentSizesOptions): Record<DrawerDetent, number>;
