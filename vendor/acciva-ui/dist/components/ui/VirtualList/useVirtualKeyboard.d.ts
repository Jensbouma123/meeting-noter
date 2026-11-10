import { type KeyboardEvent } from "react";
import type { VirtualListAlignment, VirtualListProps } from "./types.js";
interface VirtualKeyboardOptions<T> {
    items: readonly T[];
    isItemDisabled?: VirtualListProps<T>["isItemDisabled"];
    onItemSelect?: VirtualListProps<T>["onItemSelect"];
    activeIndex?: number;
    onActiveIndexChange?: VirtualListProps<T>["onActiveIndexChange"];
    resolvedActiveIndex: number;
    setInternalActiveIndex: (index: number) => void;
    scrollToIndex: (index: number, align?: VirtualListAlignment) => void;
    sizeAt: (index: number) => number;
    viewportHeight: number;
}
export declare function useVirtualKeyboard<T>({ items, isItemDisabled, onItemSelect, activeIndex, onActiveIndexChange, resolvedActiveIndex, setInternalActiveIndex, scrollToIndex, sizeAt, viewportHeight, }: VirtualKeyboardOptions<T>): {
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    disabledAt: (index: number) => boolean;
};
export {};
