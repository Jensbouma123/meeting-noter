"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
export const ListItem = forwardRef(function ListItem(_a, ref) {
    var { title, subtitle, leading, trailing, selected, checked, depth = 0, type = "button", className, style } = _a, rest = __rest(_a, ["title", "subtitle", "leading", "trailing", "selected", "checked", "depth", "type", "className", "style"]);
    const checkable = checked !== undefined;
    const isActive = checkable ? checked : selected === true;
    return (_jsxs("button", Object.assign({ ref: ref, type: type, role: checkable ? "checkbox" : undefined, "aria-checked": checkable ? checked : undefined, "aria-current": !checkable && selected ? "true" : undefined, "data-selected": isActive || undefined, className: cn("focus-ring motion-feedback flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors", "hover:bg-primary-500/8 dark:hover:bg-primary-400/15", "active:bg-primary-500/15", "disabled:cursor-not-allowed disabled:opacity-60", isActive && "bg-primary-500/10 dark:bg-primary-500/15", className), style: Object.assign({ 
            // Token-derived indent: one xl spacing step (6 units) per outline level.
            paddingInlineStart: depth > 0 ? `calc(var(--spacing) * 6 * ${depth} + var(--spacing) * 3)` : undefined }, style) }, rest, { children: [leading ? _jsx("span", { className: "flex shrink-0 items-center", children: leading }) : null, _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-medium text-foreground", children: title }), subtitle ? (_jsx("span", { className: "block truncate text-xs text-muted-foreground", children: subtitle })) : null] }), trailing ? _jsx("span", { className: "flex shrink-0 items-center", children: trailing }) : null] })));
});
