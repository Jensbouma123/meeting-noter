import { type RefObject } from "react";
import type { DataListProps } from "./DataListProps.js";
export declare function useDataListColumns<T>(props: DataListProps<T>, processedItems: readonly T[], listContainerRef: RefObject<HTMLDivElement | null>): {
    activeColumns: number;
    virtualRows: T[][];
};
