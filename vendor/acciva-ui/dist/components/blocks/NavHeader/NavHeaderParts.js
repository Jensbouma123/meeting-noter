import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu, X } from "lucide-react";
import { HStack } from "../../ui/HStack.js";
import { cn } from "../../../lib/utils.js";
export function NavHeaderMenuToggle({ open, controls, onToggle }) {
    return (_jsx(HStack, { spacing: "none", children: _jsx("button", { type: "button", onClick: onToggle, "aria-label": "Toggle primary navigation", "aria-expanded": open, "aria-controls": controls, className: "touch-target-44 focus-ring flex size-9 items-center justify-center rounded-md text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99] lg:hidden", children: _jsxs("span", { className: "relative flex size-5 items-center justify-center", "aria-hidden": "true", children: [_jsx(Menu, { className: cn("absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none", open ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100") }), _jsx(X, { className: cn("absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none", open ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75") })] }) }) }));
}
