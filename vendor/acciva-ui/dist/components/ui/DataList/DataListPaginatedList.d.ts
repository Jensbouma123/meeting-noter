import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListPaginatedListProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
}
export declare function DataListPaginatedList<T>({ props, view }: DataListPaginatedListProps<T>): import("react").JSX.Element;
export {};
