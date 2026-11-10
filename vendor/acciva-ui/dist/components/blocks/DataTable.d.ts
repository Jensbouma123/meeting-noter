import { type ReactNode } from "react";
export type SortDirection = "asc" | "desc";
export type ColumnAlign = "left" | "center" | "right";
export interface DataTableColumn<T> {
    id: string;
    header: string;
    cell: (row: T) => ReactNode;
    sortValue?: (row: T) => string | number;
    searchValue?: (row: T) => string;
    sortable?: boolean;
    width?: string;
    minWidthPx?: number;
    align?: ColumnAlign;
    primary?: boolean;
    hideOnCard?: boolean;
    wrap?: boolean;
    maxLines?: number;
}
export interface DataTableSort {
    columnId: string;
    direction: SortDirection;
}
export interface DataTableProps<T> {
    data: readonly T[];
    columns: readonly DataTableColumn<T>[];
    getRowId: (row: T, index: number) => string | number;
    caption: string;
    height?: number;
    rowHeight?: number;
    autoRowHeight?: boolean;
    estimatedCardHeight?: number;
    searchable?: boolean;
    searchPlaceholder?: string;
    initialSort?: DataTableSort;
    onRowClick?: (row: T, index: number) => void;
    emptyMessage?: string;
    toolbar?: ReactNode;
    className?: string;
}
export declare function DataTable<T>({ data, columns, getRowId, caption, height, rowHeight, autoRowHeight, estimatedCardHeight, searchable, searchPlaceholder, initialSort, onRowClick, emptyMessage, toolbar, className, }: DataTableProps<T>): import("react").JSX.Element;
