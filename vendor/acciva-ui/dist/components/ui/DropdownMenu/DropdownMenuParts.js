"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
export const DropdownMenuSeparator = forwardRef(function DropdownMenuSeparator({ className, ...props }, ref) {
    return _jsx("div", { ref: ref, role: "separator", "aria-orientation": "horizontal", className: cn("-mx-1 my-1 h-px bg-border/80", className), ...props });
});
export const DropdownMenuLabel = forwardRef(function DropdownMenuLabel({ className, children, ...props }, ref) {
    return (_jsx("div", { ref: ref, role: "presentation", className: cn("px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", className), ...props, children: children }));
});
export function DropdownMenuShortcut({ className, children, ...props }) {
    return (_jsx("kbd", { className: cn("ml-auto shrink-0 font-sans tracking-wide text-muted-foreground", TEXT_SIZE.xs, className), ...props, children: children }));
}
export const DropdownMenuGroup = forwardRef(function DropdownMenuGroup({ className, children, ...props }, ref) {
    return (_jsx("div", { ref: ref, role: "group", className: cn("space-y-0.5", className), ...props, children: children }));
});
