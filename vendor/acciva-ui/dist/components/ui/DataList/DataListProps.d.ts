import type { ReactNode, Ref } from "react";
import type { DataListHandle, DataListItemRole, DataListItemState, DataListLayout, DataListMode, DataListReorderMove, DataListResponsiveCols, DataListRole, DataListRowAction, DataListSelectionMode, DataListSortDirection, DataListSortOption, DataListTableColumn } from "./types.js";
export interface DataListProps<T> {
    items: readonly T[];
    /** Required unless `tableColumns` is set, in which case the columns render each row. */
    renderItem?: (item: T, state: DataListItemState) => ReactNode;
    /** Tabular rows: each column renders one aligned cell. When set, `renderItem` is not called. */
    tableColumns?: readonly DataListTableColumn<T>[];
    /** Shows the `tableColumns` header row. Defaults to `true`. */
    showColumnHeaders?: boolean;
    mode?: DataListMode;
    layout?: DataListLayout;
    columns?: number | DataListResponsiveCols;
    gap?: number | string;
    getItemKey?: (item: T, index: number) => string | number;
    getItemId?: (index: number) => string;
    isItemDisabled?: (item: T, index: number) => boolean;
    itemHeight?: number | ((index: number, item: T) => number);
    height?: number | string;
    overscan?: number;
    dynamic?: boolean;
    onVisibleRangeChange?: (range: {
        start: number;
        end: number;
    }) => void;
    page?: number;
    defaultPage?: number;
    pageSize?: number;
    defaultPageSize?: number;
    pageSizeOptions?: number[];
    showPageSizePicker?: boolean;
    showPageJump?: boolean;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    paginationPlacement?: "top" | "bottom" | "both";
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void | Promise<void>;
    skeletonCount?: number;
    renderSkeleton?: (index: number) => ReactNode;
    scrollThresholdPx?: number;
    searchable?: boolean;
    searchQuery?: string;
    defaultSearchQuery?: string;
    onSearchChange?: (query: string) => void;
    searchPlaceholder?: string;
    filterFn?: (item: T, query: string) => boolean;
    searchKeys?: (keyof T | ((item: T) => string))[];
    sortable?: boolean;
    sortOptions?: readonly DataListSortOption<T>[];
    sortKey?: string;
    defaultSortKey?: string;
    sortDirection?: DataListSortDirection;
    defaultSortDirection?: DataListSortDirection;
    onSortChange?: (key: string, direction: DataListSortDirection) => void;
    sortFn?: (a: T, b: T) => number;
    selectionMode?: DataListSelectionMode;
    selectedKeys?: (string | number)[] | Set<string | number>;
    defaultSelectedKeys?: (string | number)[];
    onSelectionChange?: (selectedKeys: (string | number)[], selectedItems: T[]) => void;
    onItemClick?: (item: T, index: number) => void;
    showSelectionToolbar?: boolean;
    /**
     * Per-row actions. Rendered as a trailing overflow-menu trigger on every row
     * (a `DropdownMenu`, so keyboard/focus behaviour comes from the menu). The
     * trigger stops propagation, so opening it never toggles selection or fires
     * `onItemClick`. On Apple these become swipe actions.
     */
    rowActions?: (item: T, index: number) => DataListRowAction<T>[];
    /** Accessible name (tooltip) of the per-row menu trigger. Defaults to `"Row actions"`. */
    rowActionsLabel?: string;
    /**
     * Opts rows into reordering. Fires with `{from, to}` (`to` = final index) — the
     * consumer owns the order and must apply the move to `items`. Pointer path: the row
     * menu's Move up / Move down items (SC 2.5.7). Keyboard path: Alt+ArrowUp/Down on the
     * container in `paginated`/`infinite` modes (SC 2.1.1); in `virtual` mode the row menu
     * trigger is a tab stop on every row, so Move up / Move down stay keyboard-reachable
     * there too. Moves are announced politely (SC 4.1.3).
     */
    onReorder?: (move: DataListReorderMove) => void;
    role?: DataListRole;
    itemRole?: DataListItemRole;
    /** @deprecated Use `aria-label`. Loses to it when both are set. */
    ariaLabel?: string;
    /** @deprecated Use `aria-labelledby`. Loses to it when both are set. */
    ariaLabelledBy?: string;
    /** @deprecated Use `aria-describedby`. Loses to it when both are set. */
    ariaDescribedBy?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    /** First-keyboard-focus caption for the list; `false` disables it. */
    arrowHint?: string | false;
    interactive?: boolean;
    header?: ReactNode;
    footer?: ReactNode;
    toolbar?: ReactNode;
    emptyState?: ReactNode;
    emptyMessage?: string;
    loading?: boolean;
    loadingState?: ReactNode;
    className?: string;
    listClassName?: string;
    itemClassName?: string;
    listRef?: Ref<DataListHandle>;
}
