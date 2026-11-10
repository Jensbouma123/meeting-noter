import type { RefObject } from "react";
import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListInfiniteListProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
    sentinelRef: RefObject<HTMLDivElement | null>;
}
export declare function DataListInfiniteList<T>({ props, view, sentinelRef }: DataListInfiniteListProps<T>): import("react").JSX.Element;
export {};
