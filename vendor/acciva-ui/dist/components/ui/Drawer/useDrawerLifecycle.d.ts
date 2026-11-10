import { type RefObject } from "react";
import type { DragState } from "./dragState.js";
import type { DrawerDetent } from "./types.js";
/**
 * Returns `[mounted, entered, settled, sizeResolved, setSettled, setSizeResolved,
 * uncontrolledDetent, setUncontrolledDetent, dragSize, setDragSize]`.
 * Owns the open/close state machine and everything that resets when the drawer closes.
 * The render-phase updates below run before the first commit, so the panel never paints
 * a stale frame of the previous open state.
 */
export declare function useDrawerLifecycle(open: boolean, defaultDetent: DrawerDetent, dragStateRef: RefObject<DragState | null>): readonly [boolean, boolean, boolean, boolean, import("react").Dispatch<import("react").SetStateAction<boolean>>, import("react").Dispatch<import("react").SetStateAction<boolean>>, DrawerDetent, import("react").Dispatch<import("react").SetStateAction<DrawerDetent>>, number | null, import("react").Dispatch<import("react").SetStateAction<number | null>>];
