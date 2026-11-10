import { type RefObject } from "react";
import type { VirtualListProps } from "./types.js";
interface VirtualMeasurementsOptions<T> {
    items: readonly T[];
    getItemKey?: VirtualListProps<T>["getItemKey"];
    dynamic: boolean;
    scrollRef: RefObject<HTMLDivElement | null>;
    firstVisibleRef: RefObject<number>;
    baseHeightRef: RefObject<(index: number) => number>;
    setScrollTop: (value: number) => void;
}
export declare function useVirtualMeasurements<T>({ items, getItemKey, dynamic, scrollRef, firstVisibleRef, baseHeightRef, setScrollTop, }: VirtualMeasurementsOptions<T>): {
    measuredSnapshot: ReadonlyMap<string | number, number>;
    registerItem: (node: HTMLDivElement | null) => (() => void) | undefined;
    measureAll: () => void;
};
export {};
