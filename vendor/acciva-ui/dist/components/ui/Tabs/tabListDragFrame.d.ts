import type { RefObject } from "react";
export interface DragState {
    id: number;
    x: number;
    y: number;
    start: string;
    active: boolean;
    raf: number;
    grab: number;
    w: number;
    cur: string;
    timer: number;
}
export declare function clearTarget(list: HTMLElement): void;
export declare function tickDrag(list: HTMLDivElement, indicatorRef: RefObject<HTMLSpanElement | null>, drag: RefObject<DragState | null>): void;
