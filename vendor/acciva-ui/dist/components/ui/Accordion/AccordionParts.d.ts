import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
    value: string;
    disabled?: boolean;
    children: ReactNode;
}
export declare const AccordionItem: import("react").ForwardRefExoticComponent<AccordionItemProps & import("react").RefAttributes<HTMLDivElement>>;
export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    /** Optional slot after the label (e.g. a spinner or count). Rendered before the chevron by `default`, at the row end by `plain`. */
    trailing?: ReactNode;
}
export declare const AccordionTrigger: import("react").ForwardRefExoticComponent<AccordionTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}
export declare const AccordionContent: import("react").ForwardRefExoticComponent<AccordionContentProps & import("react").RefAttributes<HTMLDivElement>>;
