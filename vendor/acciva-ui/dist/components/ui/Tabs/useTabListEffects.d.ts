import { type RefObject } from "react";
import type { DragState } from "./tabListDragFrame.js";
import type { TabsVariant } from "./types.js";
interface TabListEffectsOptions {
    listRef: RefObject<HTMLDivElement | null>;
    indicatorRef: RefObject<HTMLSpanElement | null>;
    drag: RefObject<DragState | null>;
    value: string;
    variant: TabsVariant;
    horizontal: boolean;
    canIndicate: boolean;
}
export declare function useTabListEffects({ listRef, indicatorRef, drag, value, variant, horizontal, canIndicate }: TabListEffectsOptions): void;
export {};
