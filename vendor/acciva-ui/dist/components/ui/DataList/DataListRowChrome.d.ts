import type { ReactNode } from "react";
import type { DataListRowAction } from "./types.js";
interface DataListRowChromeProps<T> {
    item: T;
    index: number;
    total: number;
    content: ReactNode;
    actions: DataListRowAction<T>[];
    canReorder: boolean;
    label: string;
    onMove: (from: number, to: number) => void;
}
export declare function DataListRowChrome<T>({ item, index, total, content, actions, canReorder, label, onMove, }: DataListRowChromeProps<T>): import("react").JSX.Element;
export {};
