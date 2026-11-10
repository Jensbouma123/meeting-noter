import { type ReactNode } from "react";
import type { DataListProps } from "./DataListProps.js";
import type { DataListItemRole, DataListItemState } from "./types.js";
interface DataListVirtualGridRowNav<T> {
    activeColumns: number;
    processedItems: readonly T[];
    selectedKeySet: Set<string | number>;
    activeIndex: number;
    getItemIdResolved: (index: number) => string;
    resolvedItemRole: DataListItemRole;
    renderRow: (item: T, state: DataListItemState) => ReactNode;
    renderRowChrome: (item: T, index: number, content: ReactNode, total: number) => ReactNode;
    handleToggleItemSelection: (item: T, index: number) => void;
}
export declare function useDataListVirtualGridRow<T>(props: DataListProps<T>, nav: DataListVirtualGridRowNav<T>): {
    renderVirtualGridRow: (rowItems: T[], rowState: {
        index: number;
    }) => import("react").JSX.Element;
};
export {};
