import { type HTMLAttributes } from "react";
import type { Spacing } from "./Stack.js";
export interface SpacerProps extends HTMLAttributes<HTMLDivElement> {
    /** Minimum length the spacer keeps once the stack runs out of free space. */
    minLength?: Spacing;
}
export declare const Spacer: import("react").ForwardRefExoticComponent<SpacerProps & import("react").RefAttributes<HTMLDivElement>>;
