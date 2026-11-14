import { type HTMLAttributes } from "react";
export type StepperVariant = "dots" | "chips";
export interface StepperProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    /** Step labels in order. Empty renders nothing. Rendered verbatim, never as HTML. */
    steps: string[];
    /** Zero-based index of the current step. Clamped to `0..steps.length - 1`. */
    current: number;
    /** Compact dots or labelled pills. */
    variant?: StepperVariant;
    /**
     * Makes completed steps (and any `isStepAllowed` step) real buttons that call this
     * with the step index. Omitted keeps the stepper display-only. In `chips` the phone
     * base shows a visible "Step n of m" line above the wrapping chip row.
     */
    onStepRequest?: (index: number) => void;
    /** Extra steps (e.g. visited-ahead) that may be requested; the current step never is. */
    isStepAllowed?: (index: number) => boolean;
}
export declare const Stepper: import("react").ForwardRefExoticComponent<StepperProps & import("react").RefAttributes<HTMLElement>>;
