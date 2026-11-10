import { type HTMLAttributes } from "react";
export type StepperVariant = "dots" | "chips";
export interface StepperProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    /** Step labels in order. Empty renders nothing. Rendered verbatim, never as HTML. */
    steps: string[];
    /** Zero-based index of the current step. Clamped to `0..steps.length - 1`. */
    current: number;
    /** Compact dots or labelled pills. */
    variant?: StepperVariant;
}
export declare const Stepper: import("react").ForwardRefExoticComponent<StepperProps & import("react").RefAttributes<HTMLElement>>;
