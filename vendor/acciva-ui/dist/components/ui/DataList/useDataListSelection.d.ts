import type { DataListProps } from "./DataListProps.js";
export declare function useDataListSelection<T>(props: DataListProps<T>, processedItems: readonly T[]): {
    selectedKeySet: Set<string | number>;
    selectedCount: number;
    handleSelectAll: () => void;
    handleClearSelection: () => void;
    handleToggleItemSelection: (item: T, index: number) => void;
};
