import type { CSSProperties, RefCallback } from "react";
import type { VirtualListItemRole, VirtualListProps, VirtualListRange, VirtualListScrollToTopOptions } from "./types.js";
interface VirtualListRowsProps<T> {
    items: readonly T[];
    range: VirtualListRange;
    count: number;
    resolvedActiveIndex: number;
    interactive: boolean;
    disabledAt: (index: number) => boolean;
    isItemSelected?: VirtualListProps<T>["isItemSelected"];
    dynamic: boolean;
    offsetAt: (index: number) => number;
    sizeAt: (index: number) => number;
    getItemKey?: VirtualListProps<T>["getItemKey"];
    itemId: (index: number) => string;
    registerItem: RefCallback<HTMLDivElement>;
    itemRole: VirtualListItemRole;
    itemClassName?: string;
    itemStyle?: CSSProperties;
    onItemSelect?: VirtualListProps<T>["onItemSelect"];
    renderItem: VirtualListProps<T>["renderItem"];
}
export declare function VirtualListRows<T>({ items, range, count, resolvedActiveIndex, interactive, disabledAt, isItemSelected, dynamic, offsetAt, sizeAt, getItemKey, itemId, registerItem, itemRole, itemClassName, itemStyle, onItemSelect, renderItem, }: VirtualListRowsProps<T>): import("react").JSX.Element;
interface VirtualListScrollToTopProps {
    options?: VirtualListScrollToTopOptions;
    visible: boolean;
    fullWidth: boolean;
    onClick: () => void;
}
export declare function VirtualListScrollToTop({ options, visible, fullWidth, onClick }: VirtualListScrollToTopProps): import("react").JSX.Element;
export {};
