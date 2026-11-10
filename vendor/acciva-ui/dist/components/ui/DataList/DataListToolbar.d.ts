import type { DataListProps } from "./DataListProps.js";
import type { DataListView } from "./useDataListView.js";
interface DataListToolbarProps<T> {
    props: DataListProps<T>;
    view: DataListView<T>;
}
export declare function DataListToolbar<T>({ props, view }: DataListToolbarProps<T>): import("react").JSX.Element;
export {};
