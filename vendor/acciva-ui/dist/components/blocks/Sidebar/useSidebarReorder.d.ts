import { type RefObject } from "react";
import type { SidebarItem, SidebarReorderMove } from "./SidebarTypes.js";
export declare function useSidebarReorder({ items, onReorder, railRefs, drawerRefs, }: {
    items: SidebarItem[];
    onReorder?: (move: SidebarReorderMove) => void;
    railRefs: RefObject<(HTMLAnchorElement | null)[]>;
    drawerRefs: RefObject<(HTMLAnchorElement | null)[]>;
}): {
    queueFocus: (list: "rail" | "drawer", index: number) => void;
    visibleReorderNote: string;
    handleReorderMove: (from: number, to: number) => void;
};
