import type { DataListTableColumn } from "./types.js";
interface DataListColumnHeaderProps<T> {
    columns: readonly DataListTableColumn<T>[];
    template: string | undefined;
}
export declare function DataListColumnHeader<T>({ columns, template }: DataListColumnHeaderProps<T>): import("react").JSX.Element;
export {};
