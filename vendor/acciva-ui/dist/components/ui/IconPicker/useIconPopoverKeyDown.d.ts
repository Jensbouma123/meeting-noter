import type { KeyboardEvent } from "react";
/** Popover-wide Escape: closes from any control inside the panel (chips included), not only the grid. */
export declare function useIconPopoverKeyDown(closeAndFocusTrigger: () => void): (event: KeyboardEvent<HTMLDivElement>) => void;
