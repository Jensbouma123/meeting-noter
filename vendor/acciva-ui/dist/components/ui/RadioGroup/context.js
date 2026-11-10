"use client";
import { createContext, useContext } from "react";
export const RadioGroupContext = createContext(null);
export function useRadioGroupContext(component) {
    const ctx = useContext(RadioGroupContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within a <RadioGroup>`);
    }
    return ctx;
}
