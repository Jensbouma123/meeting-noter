"use client";
import { createContext, useContext } from "react";
export const TabsContext = createContext(null);
export function useTabsContext(component) {
    const ctx = useContext(TabsContext);
    if (!ctx)
        throw new Error(`<${component}> must be used within <Tabs>`);
    return ctx;
}
