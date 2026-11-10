import type { DataTableProps } from "./dataTableTypes.js";
export type { ColumnAlign, DataTableColumn, DataTableProps, DataTableSort, SortDirection } from "./dataTableTypes.js";
export declare function DataTable<T>({ data, columns, getRowId, caption, height, rowHeight, autoRowHeight, estimatedCardHeight, searchable, searchPlaceholder, initialSort, onRowClick, emptyMessage, toolbar, className, }: DataTableProps<T>): import("react").JSX.Element;
