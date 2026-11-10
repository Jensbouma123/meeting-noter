import type { DataTableColumn } from "./dataTableTypes.js";
export declare function useDataTableLayout<T>(columns: readonly DataTableColumn<T>[]): {
    gridTemplate: string;
    tableMinWidth: number;
    cardColumns: DataTableColumn<T>[];
    primaryColumn: DataTableColumn<T>;
};
