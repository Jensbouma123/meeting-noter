import { type HTMLAttributes } from "react";
import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange" | "onKeyDown"> {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    onChange: (value: number) => void;
    formatValue?: (value: number) => string;
    disabled?: boolean;
    size?: ResponsiveSize<SizeTier>;
    /** Merged onto the root wrapper that holds the label row and the track. */
    className?: string;
    "aria-label"?: string;
}
export declare function Slider({ value, min, max, step, label, onChange, formatValue, disabled, size, className, "aria-label": ariaLabel, ...props }: SliderProps): import("react").JSX.Element;
