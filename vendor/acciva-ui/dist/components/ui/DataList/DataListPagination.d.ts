import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListPaginationProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
}
export declare function DataListPagination<T>({ props, view }: DataListPaginationProps<T>): import("react").JSX.Element | null;
export {};
