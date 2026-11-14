import { type RefObject } from "react";
import type { SidebarItem, SidebarReorderMove } from "./SidebarTypes.js";
export declare function SidebarDrawer({ items, pathname, mobileOpen, onMobileClose, drawerRefs, queueFocus, onReorder, onMove, }: {
    items: SidebarItem[];
    pathname: string | null;
    mobileOpen: boolean;
    onMobileClose: () => void;
    drawerRefs: RefObject<(HTMLAnchorElement | null)[]>;
    queueFocus: (list: "rail" | "drawer", index: number) => void;
    onReorder?: (move: SidebarReorderMove) => void;
    onMove: (from: number, to: number) => void;
}): import("react").JSX.Element;
