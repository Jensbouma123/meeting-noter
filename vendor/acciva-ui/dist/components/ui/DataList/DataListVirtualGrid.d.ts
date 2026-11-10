import type { RefObject } from "react";
import { type VirtualListHandle } from "../VirtualList/index.js";
import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListVirtualGridProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
    virtualListRef: RefObject<VirtualListHandle | null>;
}
export declare function DataListVirtualGrid<T>({ props, view, virtualListRef }: DataListVirtualGridProps<T>): import("react").JSX.Element;
export {};
