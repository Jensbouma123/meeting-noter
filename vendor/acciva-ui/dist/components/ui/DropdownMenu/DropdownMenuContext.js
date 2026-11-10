"use client";
import { createContext, useContext } from "react";
export const DropdownMenuContext = createContext(null);
export function useDropdownMenuContext(component) {
    const ctx = useContext(DropdownMenuContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <DropdownMenu>`);
    }
    return ctx;
}
