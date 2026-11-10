import { type HTMLAttributes, type ReactNode } from "react";
import { type AccordionVariant } from "./AccordionChrome.js";
export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
    type?: "single" | "multiple";
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    collapsible?: boolean;
    variant?: AccordionVariant;
    children: ReactNode;
}
export declare const Accordion: import("react").ForwardRefExoticComponent<AccordionProps & import("react").RefAttributes<HTMLDivElement>>;
