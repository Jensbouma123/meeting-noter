import { type HTMLAttributes, type ReactNode } from "react";
import type { SizeTier } from "../../lib/sizing-tokens.js";
import { type Spacing, type StackAlign } from "./Stack.js";
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
    columns?: number | {
        base?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
    };
    spacing?: Spacing;
    align?: StackAlign;
    minItemWidth?: SizeTier;
    inset?: Spacing;
    children?: ReactNode;
}
export declare const Grid: import("react").ForwardRefExoticComponent<GridProps & import("react").RefAttributes<HTMLDivElement>>;
