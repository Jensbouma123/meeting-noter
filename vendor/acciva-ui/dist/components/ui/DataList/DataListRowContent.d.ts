import type { DataListTableColumn } from "./types.js";
interface DataListRowContentProps<T> {
    columns: readonly DataListTableColumn<T>[];
    template: string | undefined;
    item: T;
    index: number;
}
export declare function DataListRowContent<T>({ columns, template, item, index }: DataListRowContentProps<T>): import("react").JSX.Element;
export {};
