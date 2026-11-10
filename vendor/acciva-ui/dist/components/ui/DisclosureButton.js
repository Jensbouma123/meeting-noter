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
import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { CONTROL_GAP, CONTROL_HEIGHT, CONTROL_PADDING_X, CONTROL_RADIUS, ICON_SCALE_CLASS, TEXT_SIZE, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
/**
 * Ghost text trigger with a trailing chevron, for opening a menu, popover or listbox. It owns no
 * open state: `aria-expanded` and `aria-haspopup` pass through from the caller (or a
 * `DropdownMenuTrigger`, which clones the child with them).
 */
export const DisclosureButton = forwardRef(function DisclosureButton(_a, ref) {
    var { className, size = "md", leadingIcon, children, type = "button" } = _a, props = __rest(_a, ["className", "size", "leadingIcon", "children", "type"]);
    return (_jsxs("button", Object.assign({ ref: ref, type: type, className: cn("group focus-ring inline-flex items-center rounded-lg font-medium text-muted-foreground transition-colors motion-feedback", "hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3", "disabled:cursor-not-allowed disabled:opacity-60", CONTROL_HEIGHT[size], CONTROL_PADDING_X[size], CONTROL_RADIUS[size], CONTROL_GAP[size], TEXT_SIZE[size], ICON_SCALE_CLASS[size], touchTargetClass(size), className) }, props, { children: [leadingIcon, children, _jsx(ChevronDown, { "aria-hidden": "true", className: "shrink-0 transition-transform motion-feedback group-aria-expanded:rotate-180" })] })));
});
