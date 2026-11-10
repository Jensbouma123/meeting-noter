import { type Ref, type RefObject } from "react";
import type { VirtualListAlignment, VirtualListHandle } from "./types.js";
interface VirtualScrollOptions {
    listRef?: Ref<VirtualListHandle>;
    scrollRef: RefObject<HTMLDivElement | null>;
    height: number | string;
    count: number;
    layoutTotal: number;
    offsetAt: (index: number) => number;
    sizeAt: (index: number) => number;
    setScrollTop: (value: number) => void;
    setViewportHeight: (value: number) => void;
    measureAll: () => void;
}
export declare function useVirtualScroll({ listRef, scrollRef, height, count, layoutTotal, offsetAt, sizeAt, setScrollTop, setViewportHeight, measureAll, }: VirtualScrollOptions): {
    handleScroll: () => void;
    handleScrollToTop: () => void;
    scrollToIndex: (index: number, align?: VirtualListAlignment) => void;
};
export {};
