import type { KeyboardEvent, RefObject } from "react";
import type { SidebarItem, SidebarReorderMove } from "./SidebarTypes.js";
export declare function SidebarRail({ items, pathname, className, railRefs, onReorder, onMove, onListKeyDown, }: {
    items: SidebarItem[];
    pathname: string | null;
    className?: string;
    railRefs: RefObject<(HTMLAnchorElement | null)[]>;
    onReorder?: (move: SidebarReorderMove) => void;
    onMove: (from: number, to: number) => void;
    onListKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void;
}): import("react").JSX.Element;
