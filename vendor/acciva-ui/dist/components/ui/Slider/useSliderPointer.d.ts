import { type PointerEvent as ReactPointerEvent } from "react";
import type { SliderRange } from "./types.js";
export declare function useSliderPointer({ min, max, step, disabled, onChange }: SliderRange): {
    trackRef: import("react").RefObject<HTMLDivElement | null>;
    thumbRef: import("react").RefObject<HTMLDivElement | null>;
    handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};
