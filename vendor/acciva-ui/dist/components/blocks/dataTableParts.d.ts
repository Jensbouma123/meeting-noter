import type { ReactNode } from "react";
import type { DataTableColumn, DataTableSort } from "./dataTableTypes.js";
export declare function renderTableRowCells<T>(row: T, columns: readonly DataTableColumn<T>[]): ReactNode;
interface DataTableHeaderRowProps<T> {
    columns: readonly DataTableColumn<T>[];
    gridTemplate: string;
    sort: DataTableSort | null;
    toggleSort: (columnId: string) => void;
}
export declare function DataTableHeaderRow<T>({ columns, gridTemplate, sort, toggleSort }: DataTableHeaderRowProps<T>): import("react").JSX.Element;
export declare function renderDataTableCard<T>(row: T, cardColumns: readonly DataTableColumn<T>[], primaryColumn: DataTableColumn<T> | undefined): ReactNode;
export {};
