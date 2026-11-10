"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useId } from "react";
import { TabsContext } from "./useTabsContext.js";
export function Tabs({ value, onValueChange, children, className, size = "md", variant = "pill", orientation = "horizontal", draggable = true, }) {
    const baseId = useId();
    return (_jsx(TabsContext.Provider, { value: { value, setValue: onValueChange, baseId, size, variant, orientation, draggable }, children: _jsx("div", { className: className, children: children }) }));
}
