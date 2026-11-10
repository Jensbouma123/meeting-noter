import { type ReactNode, type Ref } from "react";
export type DataListMode = "virtual" | "paginated" | "infinite";
export type DataListLayout = "list" | "grid";
export type DataListSelectionMode = "none" | "single" | "multiple";
export type DataListRole = "list" | "feed" | "listbox" | "grid";
export type DataListItemRole = "listitem" | "article" | "option" | "row";
export type DataListSortDirection = "asc" | "desc";
export interface DataListItemState {
    index: number;
    selected: boolean;
    active: boolean;
    disabled: boolean;
}
/** One per-row action: an overflow-menu item on web, a swipe action on Apple. */
export interface DataListRowAction<T> {
    /** Stable React key within the row's menu. */
    key: string;
    /** Menu item label, announced by assistive tech (SC 4.1.2). */
    label: string;
    icon?: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    onSelect: (item: T, index: number) => void;
}
/**
 * A single-item reorder. `to` is the item's final index after the move. The list
 * never reorders itself — apply the move to `items` in this callback's owner.
 */
export interface DataListReorderMove {
    from: number;
    to: number;
}
export interface DataListSortOption<T> {
    key: string;
    label: string;
    compare?: (a: T, b: T) => number;
}
export type DataListColumnAlign = "start" | "end";
export interface DataListTableColumn<T> {
    /** Stable React key for the column. */
    key: string;
    /** Column heading. Shown visually in the header row and read before each cell (SC 1.3.1). */
    header: ReactNode;
    /** `end` right-aligns the column, the usual choice for amounts. Defaults to `start`. */
    align?: DataListColumnAlign;
    /** Applies `tabular-nums` so digits share one width and decimals line up. */
    numeric?: boolean;
    /** Renders this column's cell for one item. */
    cell: (item: T, index: number) => ReactNode;
}
export interface DataListResponsiveCols {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
}
export interface DataListHandle {
    scrollToIndex: (index: number) => void;
    scrollToOffset: (offset: number) => void;
    getScrollElement: () => HTMLElement | null;
    clearSelection: () => void;
    selectAll: () => void;
}
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
export declare function DataList<T>({ items, renderItem, tableColumns, showColumnHeaders, mode, layout, columns, gap, getItemKey, getItemId, isItemDisabled, itemHeight, height, overscan, dynamic, onVisibleRangeChange, page: controlledPage, defaultPage, pageSize: controlledPageSize, defaultPageSize, pageSizeOptions, showPageSizePicker, showPageJump, onPageChange, onPageSizeChange, paginationPlacement, hasMore, isLoadingMore, onLoadMore, skeletonCount, renderSkeleton, scrollThresholdPx, searchable, searchQuery: controlledSearchQuery, defaultSearchQuery, onSearchChange, searchPlaceholder, filterFn, searchKeys, sortable, sortOptions, sortKey: controlledSortKey, defaultSortKey, sortDirection: controlledSortDirection, defaultSortDirection, onSortChange, sortFn, selectionMode, selectedKeys: controlledSelectedKeys, defaultSelectedKeys, onSelectionChange, onItemClick, showSelectionToolbar, rowActions, rowActionsLabel, onReorder, role: customRole, itemRole: customItemRole, ariaLabel: deprecatedAriaLabel, ariaLabelledBy: deprecatedAriaLabelledBy, ariaDescribedBy: deprecatedAriaDescribedBy, "aria-label": ariaLabelAttr, "aria-labelledby": ariaLabelledByAttr, "aria-describedby": ariaDescribedByAttr, interactive, header, footer, toolbar, emptyState, emptyMessage, loading, loadingState, className, listClassName, itemClassName, listRef, }: DataListProps<T>): import("react").JSX.Element;
