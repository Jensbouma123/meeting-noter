import type { DrawerDetent, DrawerSide } from "./types.js";
/** The `<dialog>` class list: shape, slide, fade and the motion for the current phase. */
export declare function panelClassName(open: boolean, entered: boolean, settled: boolean, isDragging: boolean, isVertical: boolean, isPersistent: boolean, side: DrawerSide, detent: DrawerDetent, className: string | undefined): string;
