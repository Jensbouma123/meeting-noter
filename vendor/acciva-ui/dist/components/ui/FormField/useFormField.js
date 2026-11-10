"use client";
import { createContext, useContext } from "react";
export const FormFieldContext = createContext(null);
export function useFormField() {
    const ctx = useContext(FormFieldContext);
    if (!ctx) {
        throw new Error("useFormField must be used within a <FormField>");
    }
    return ctx;
}
