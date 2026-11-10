import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { type DragState } from "./dragState.js";
import { type DrawerDetent, type DrawerSide } from "./types.js";
/** Returns `[onPointerDown, onPointerMove, onPointerUp, onPointerCancel]`. Resize drag on the handle slider: tracks the pointer and snaps to a detent on release. */
export declare function useDragResize(dragEnabled: boolean, isVertical: boolean, resolvedSide: DrawerSide, restSize: number, detentSizes: Record<DrawerDetent, number>, detentOrder: number[], detentIndex: number, commitDetent: (next: DrawerDetent) => void, setSettled: (settled: boolean) => void, setDragSize: (size: number | null) => void, requestClose: () => void, dragStateRef: RefObject<DragState | null>): readonly [(event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void];
