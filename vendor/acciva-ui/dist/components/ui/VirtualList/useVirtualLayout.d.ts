import { type RefObject } from "react";
import type { VirtualListProps, VirtualListRange } from "./types.js";
export interface VirtualLayout {
    offsets: Float64Array | null;
    total: number;
}
interface VirtualLayoutOptions<T> {
    items: readonly T[];
    itemHeight: VirtualListProps<T>["itemHeight"];
    dynamic: boolean;
    getItemKey?: VirtualListProps<T>["getItemKey"];
    measuredSnapshot: ReadonlyMap<string | number, number>;
    baseHeightAt: (index: number) => number;
    scrollToTopEnabled: boolean;
    scrollTop: number;
    viewportHeight: number;
    overscan: number;
    firstVisibleRef: RefObject<number>;
    onVisibleRangeChange?: VirtualListProps<T>["onVisibleRangeChange"];
}
export declare function useVirtualLayout<T>({ items, itemHeight, dynamic, getItemKey, measuredSnapshot, baseHeightAt, scrollToTopEnabled, scrollTop, viewportHeight, overscan, firstVisibleRef, onVisibleRangeChange, }: VirtualLayoutOptions<T>): {
    layout: VirtualLayout;
    offsetAt: (index: number) => number;
    sizeAt: (index: number) => number;
    range: VirtualListRange;
};
export {};
