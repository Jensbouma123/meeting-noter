import type { DataTableColumn, DataTableSort } from "./dataTableTypes.js";
export declare function useDataTableRows<T>(data: readonly T[], columns: readonly DataTableColumn<T>[], initialSort: DataTableSort | undefined): {
    query: string;
    setQuery: import("react").Dispatch<import("react").SetStateAction<string>>;
    sort: DataTableSort | null;
    rows: readonly T[];
    toggleSort: (columnId: string) => void;
};
