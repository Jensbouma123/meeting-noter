import { type PointerEvent, type RefObject } from "react";
import { type DragState } from "./tabListDragFrame.js";
import type { TabsVariant } from "./types.js";
interface TabListDragOptions {
    listRef: RefObject<HTMLDivElement | null>;
    indicatorRef: RefObject<HTMLSpanElement | null>;
    value: string;
    setValue: (value: string) => void;
    variant: TabsVariant;
    canDrag: boolean;
}
export declare function useTabListDrag({ listRef, indicatorRef, value, setValue, variant, canDrag }: TabListDragOptions): {
    drag: RefObject<DragState | null>;
    stopDrag: (commit: boolean) => void;
    handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
};
export {};
