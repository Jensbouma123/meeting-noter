import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { type DragState } from "./dragState.js";
import type { DrawerDetent, DrawerSide } from "./types.js";
/**
 * Returns `[onPointerDown, onPointerMove, onPointerUp, onPointerCancel]`.
 * Swipe-to-dismiss tracks the same samples as a resize drag but never resizes and
 * never snaps: only a closing flick (same velocity, travel and origin tolerance)
 * dismisses, everything else settles back where it was.
 */
export declare function useSwipeDismiss(swipeGestureEnabled: boolean, isVertical: boolean, resolvedSide: DrawerSide, restSize: number, detentSizes: Record<DrawerDetent, number>, requestClose: () => void, dragStateRef: RefObject<DragState | null>): readonly [(event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void, (event: ReactPointerEvent<HTMLButtonElement>) => void];
