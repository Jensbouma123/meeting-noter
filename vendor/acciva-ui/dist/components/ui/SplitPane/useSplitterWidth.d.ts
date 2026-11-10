import { type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { SplitPaneSidebarWidth } from "./SplitPaneTypes.js";
export declare function useSplitterWidth(defaultSidebarWidth: SplitPaneSidebarWidth, onSidebarWidthChange: ((width: number) => void) | undefined): {
    widthPx: number;
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};
