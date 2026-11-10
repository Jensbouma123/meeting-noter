import { type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import type { DataListProps } from "./DataListProps.js";
interface DataListKeyboardNav<T> {
    processedItems: readonly T[];
    activeColumns: number;
    activeIndex: number;
    setActiveIndex: Dispatch<SetStateAction<number>>;
    handleToggleItemSelection: (item: T, index: number) => void;
    handleReorderMove: (from: number, to: number) => void;
}
export declare function useDataListKeyboard<T>(props: DataListProps<T>, nav: DataListKeyboardNav<T>): (event: KeyboardEvent<HTMLDivElement>) => void;
export {};
