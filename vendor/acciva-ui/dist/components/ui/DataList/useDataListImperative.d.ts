import { type RefObject } from "react";
import type { VirtualListHandle } from "../VirtualList/index.js";
import type { DataListProps } from "./DataListProps.js";
interface DataListImperativeNav {
    activeColumns: number;
    virtualListRef: RefObject<VirtualListHandle | null>;
    listContainerRef: RefObject<HTMLDivElement | null>;
    handleClearSelection: () => void;
    handleSelectAll: () => void;
}
export declare function useDataListImperative<T>(props: DataListProps<T>, nav: DataListImperativeNav): void;
export {};
