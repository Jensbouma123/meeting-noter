import type { AccordionVariant } from "./AccordionChrome.js";
interface AccordionContextValue {
    expandedValues: Set<string>;
    toggleValue: (value: string) => void;
    type: "single" | "multiple";
    collapsible: boolean;
    variant: AccordionVariant;
}
export declare const AccordionContext: import("react").Context<AccordionContextValue | null>;
export declare function useAccordionContext(component: string): AccordionContextValue;
export {};
