import type { KeyboardEvent, RefObject } from "react";
import type { DragState } from "./tabListDragFrame.js";
interface TabListKeysOptions {
    listRef: RefObject<HTMLDivElement | null>;
    horizontal: boolean;
    drag: RefObject<DragState | null>;
    stopDrag: (commit: boolean) => void;
}
export declare function useTabListKeys({ listRef, horizontal, drag, stopDrag }: TabListKeysOptions): (event: KeyboardEvent<HTMLDivElement>) => void;
export {};
