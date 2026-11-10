import type { DataListProps } from "./DataListProps.js";
export declare function useDataListSearch<T>(props: DataListProps<T>): {
    activeSearchQuery: string;
    deferredSearchQuery: string;
    handleSearchChange: (newQuery: string) => void;
    filteredItems: readonly T[];
};
