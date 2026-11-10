import type { KeyboardEvent } from "react";
import type { SliderRange } from "./types.js";
export declare function useSliderKeys({ value, min, max, step, disabled, onChange }: SliderRange & {
    value: number;
}): (event: KeyboardEvent<HTMLDivElement>) => void;
