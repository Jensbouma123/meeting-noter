import type { CSSProperties } from "react";
import type { DrawerDetent } from "./types.js";
/** What the handle announces and how the panel is sized, derived from the live drag/detent state. */
export declare function drawerReadout(dragSize: number | null, restSize: number, detentSizes: Record<DrawerDetent, number>, detent: DrawerDetent, docked: boolean, isVertical: boolean, draggable: boolean, sizeResolved: boolean, connectToBottomNav: boolean, bottomNavHeight: number): {
    isDragging: boolean;
    renderedSize: number;
    reportedSize: number;
    valueText: string;
    handleOrientation: "horizontal" | "vertical";
    defaultHandleLabel: string;
    insetBottom: number;
    barVisible: boolean;
    sizeStyle: CSSProperties | undefined;
};
