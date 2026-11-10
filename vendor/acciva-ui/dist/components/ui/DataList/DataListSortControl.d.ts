import type { DataListSortDirection, DataListSortOption } from "./types.js";
interface DataListSortControlProps<T> {
    id: string;
    options: readonly DataListSortOption<T>[];
    activeKey: string | undefined;
    direction: DataListSortDirection;
    onSortChange: (key: string, direction: DataListSortDirection) => void;
    onToggleDirection: () => void;
}
export declare function DataListSortControl<T>({ id, options, activeKey, direction, onSortChange, onToggleDirection, }: DataListSortControlProps<T>): import("react").JSX.Element;
export {};
