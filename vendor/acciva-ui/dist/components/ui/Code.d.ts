import { type HTMLAttributes } from "react";
/** `plain` inherits the surrounding size and recolours; `pill` is a bordered chip. */
export type CodeVariant = "plain" | "pill";
export interface CodeProps extends HTMLAttributes<HTMLElement> {
    /** Plain coloured text, or a bordered pill. */
    variant?: CodeVariant;
}
export declare const Code: import("react").ForwardRefExoticComponent<CodeProps & import("react").RefAttributes<HTMLElement>>;
