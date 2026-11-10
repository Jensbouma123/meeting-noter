import { type RefObject } from "react";
import type { VirtualListHandle } from "../VirtualList/index.js";
import type { DataListProps } from "./DataListProps.js";
export interface DataListRefs {
    listContainerRef: RefObject<HTMLDivElement | null>;
    virtualListRef: RefObject<VirtualListHandle | null>;
    sentinelRef: RefObject<HTMLDivElement | null>;
}
export declare function useDataListView<T>(props: DataListProps<T>, refs: DataListRefs): {
    handleContainerKeyDown: (event: import("react").KeyboardEvent<HTMLDivElement>) => void;
    ariaLabel: string | undefined;
    ariaLabelledBy: string | undefined;
    ariaDescribedBy: string | undefined;
    generatedId: string;
    searchInputId: string;
    statusRegionId: string;
    resolvedContainerRole: import("./types.js").DataListRole;
    resolvedItemRole: import("./types.js").DataListItemRole;
    getItemIdResolved: (index: number) => string;
    listHint: {
        groupProps: {
            onFocusCapture: () => void;
            onBlurCapture: (event: import("react").FocusEvent<HTMLElement>) => void;
            onKeyDownCapture: (event: import("react").KeyboardEvent<HTMLElement>) => void;
        };
        visible: boolean;
        id: string;
        text: string | null;
        describedBy: (existing?: string) => string | undefined;
    };
    renderVirtualGridRow: (rowItems: T[], rowState: {
        index: number;
    }) => import("react").JSX.Element;
    columnTemplate: string | undefined;
    renderRow: (item: T, state: import("./types.js").DataListItemState) => import("react").ReactNode;
    renderRowChrome: (item: T, index: number, content: import("react").ReactNode, total: number) => import("react").ReactNode;
    activeColumns: number;
    virtualRows: T[][];
    activeIndex: number;
    setActiveIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
    handleReorderMove: (from: number, to: number) => void;
    visibleReorderNote: string;
    activePageSize: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    paginatedItems: readonly T[];
    handlePageChange: (newPage: number) => void;
    handlePageSizeChange: (newSize: number) => void;
    jumpPageInput: string;
    setJumpPageInput: import("react").Dispatch<import("react").SetStateAction<string>>;
    handleJumpSubmit: (e: import("react").FormEvent) => void;
    selectedKeySet: Set<string | number>;
    selectedCount: number;
    handleSelectAll: () => void;
    handleClearSelection: () => void;
    handleToggleItemSelection: (item: T, index: number) => void;
    activeSortKey: string | undefined;
    activeSortDirection: import("./types.js").DataListSortDirection;
    handleSortChange: (key: string, direction: import("./types.js").DataListSortDirection) => void;
    toggleSortDirection: () => void;
    processedItems: readonly T[];
    activeSearchQuery: string;
    deferredSearchQuery: string;
    handleSearchChange: (newQuery: string) => void;
    filteredItems: readonly T[];
};
export type DataListView<T> = ReturnType<typeof useDataListView<T>>;
