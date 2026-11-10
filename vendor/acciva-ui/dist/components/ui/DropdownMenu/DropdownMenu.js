"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { DropdownMenuContext } from "./DropdownMenuContext.js";
import { useDropdownMenuState } from "./useDropdownMenuState.js";
export function DropdownMenu({ open: controlledOpen, defaultOpen = false, onOpenChange, children, }) {
    const value = useDropdownMenuState(controlledOpen, defaultOpen, onOpenChange);
    return (_jsx(DropdownMenuContext.Provider, { value: value, children: _jsx("div", { className: "relative inline-block text-left", children: children }) }));
}
