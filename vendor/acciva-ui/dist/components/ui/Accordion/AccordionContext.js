"use client";
import { createContext, useContext } from "react";
export const AccordionContext = createContext(null);
export function useAccordionContext(component) {
    const ctx = useContext(AccordionContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <Accordion>`);
    }
    return ctx;
}
