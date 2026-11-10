import { type ReactNode } from "react";
import type { DataTableColumn, DataTableSort } from "./dataTableTypes.js";
interface DataTableWideProps<T> {
    caption: string;
    columns: readonly DataTableColumn<T>[];
    rows: readonly T[];
    getRowId: (row: T, index: number) => string | number;
    gridTemplate: string;
    tableMinWidth: number;
    sort: DataTableSort | null;
    toggleSort: (columnId: string) => void;
    rowHeight: number;
    autoRowHeight: boolean;
    height: number;
    onRowClick?: (row: T, index: number) => void;
    emptyState: ReactNode;
}
export declare function DataTableWide<T>({ caption, columns, rows, getRowId, gridTemplate, tableMinWidth, sort, toggleSort, rowHeight, autoRowHeight, height, onRowClick, emptyState, }: DataTableWideProps<T>): import("react").JSX.Element;
export {};
