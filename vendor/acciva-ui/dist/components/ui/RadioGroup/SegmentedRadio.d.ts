import { type ButtonHTMLAttributes, type ReactNode } from "react";
interface SegmentedRadioProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> {
    label?: ReactNode;
    checked: boolean;
}
/**
 * One segment of a `variant="segmented"` group. Still a `role="radio"` button; the
 * checked segment is a raised fill plus `font-semibold`, so colour is never the only
 * signal (SC 1.4.1). Height comes from `CONTROL_HEIGHT`, never below 24px (SC 2.5.8).
 */
export declare const SegmentedRadio: import("react").ForwardRefExoticComponent<SegmentedRadioProps & import("react").RefAttributes<HTMLButtonElement>>;
export {};
