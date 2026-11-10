import type { RefObject } from "react";
import type { VirtualListHandle } from "../VirtualList/index.js";
import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListBodyProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
    virtualListRef: RefObject<VirtualListHandle | null>;
    sentinelRef: RefObject<HTMLDivElement | null>;
}
export declare function DataListBody<T>({ props, view, virtualListRef, sentinelRef }: DataListBodyProps<T>): string | number | bigint | boolean | Iterable<import("react").ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<import("react").ReactNode> | null | undefined> | import("react").JSX.Element;
export {};
