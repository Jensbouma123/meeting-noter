import { type ReactNode } from "react";
import type { DataListProps } from "./DataListProps.js";
import type { DataListItemState } from "./types.js";
export declare function useDataListRenderers<T>(props: DataListProps<T>, handleReorderMove: (from: number, to: number) => void): {
    columnTemplate: string | undefined;
    renderRow: (item: T, state: DataListItemState) => ReactNode;
    renderRowChrome: (item: T, index: number, content: ReactNode, total: number) => ReactNode;
};
