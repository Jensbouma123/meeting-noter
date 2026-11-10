import type { DataListProps } from "./DataListProps.js";
import type { DataListSortDirection } from "./types.js";
export declare function useDataListSort<T>(props: DataListProps<T>, filteredItems: readonly T[]): {
    activeSortKey: string | undefined;
    activeSortDirection: DataListSortDirection;
    handleSortChange: (key: string, direction: DataListSortDirection) => void;
    toggleSortDirection: () => void;
    processedItems: readonly T[];
};
