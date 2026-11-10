import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { type DrawerDetent, type DrawerProps, type DrawerSide } from "./types.js";
/** Returns `[detent, detentOrder, detentIndex, restSize, commitDetent, onKeyDown, onClick]`. */
export declare function useDetentControl(controlledDetent: DrawerDetent | undefined, uncontrolledDetent: DrawerDetent, setUncontrolledDetent: (detent: DrawerDetent) => void, detentSizes: Record<DrawerDetent, number>, resolvedSide: DrawerSide, dragEnabled: boolean, onSnapChange: DrawerProps["onSnapChange"], setSettled: (settled: boolean) => void): readonly [DrawerDetent, number[], number, number, (next: DrawerDetent) => void, (event: ReactKeyboardEvent<HTMLButtonElement>) => void, () => void];
