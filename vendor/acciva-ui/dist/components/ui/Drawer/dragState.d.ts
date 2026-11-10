import type { PointerEvent as ReactPointerEvent } from "react";
import type { DrawerSide } from "./types.js";
export interface DragSample {
    t: number;
    h: number;
}
export interface DragState {
    startCoord: number;
    startSize: number;
    samples: DragSample[];
}
export declare function axisCoord(event: ReactPointerEvent<HTMLElement>, isVertical: boolean): number;
/** `left` grows with the pointer; `bottom` and `right` grow against it. */
export declare function growthSignFor(side: DrawerSide): number;
export declare function startPointerDrag(event: ReactPointerEvent<HTMLButtonElement>, isVertical: boolean, restSize: number): DragState;
/** Records the pointer's clamped size as a sample and returns it. */
export declare function trackPointerMove(drag: DragState, event: ReactPointerEvent<HTMLButtonElement>, isVertical: boolean, side: DrawerSide, full: number): number;
export declare function releasePointer(event: ReactPointerEvent<HTMLButtonElement>): void;
export declare function summarizeDrag(drag: DragState): {
    last: DragSample;
    velocity: number;
    travelDistance: number;
};
export declare function isClosingFlickFromPeek(drag: DragState, velocity: number, travelDistance: number, last: DragSample, peek: number): boolean;
