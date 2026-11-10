import { type HTMLAttributes } from "react";
import type { Spacing } from "./Stack/index.js";
/** Orientation of the rule. */
export type DividerOrientation = "horizontal" | "vertical";
export interface DividerProps extends HTMLAttributes<HTMLElement> {
    /** Axis the rule runs along. */
    orientation?: DividerOrientation;
    /** Margin pulling the rule in from both ends of its own axis. */
    inset?: Spacing;
    /** When true the rule is hidden from assistive tech; when false it is a real separator. */
    decorative?: boolean;
}
export declare const Divider: import("react").ForwardRefExoticComponent<DividerProps & import("react").RefAttributes<HTMLHRElement>>;
