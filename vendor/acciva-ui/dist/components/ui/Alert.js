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
import { X } from "lucide-react";
import { forwardRef } from "react";
import { Button } from "../../components/ui/Button.js";
import { cn } from "../../lib/utils.js";
import { VARIANT_ACCENT_BORDER, VARIANT_ACCENT_TEXT, VARIANT_ICON, VARIANT_POLITENESS, VARIANT_TINT_BG, } from "../../components/ui/variant-tokens.js";
// Layout changes the box, never the semantics: the live-region role, the decorative icon and
// the `text-foreground` body copy (the pairing measured for SC 1.4.3) are identical in all three.
const LAYOUT_BOX = {
    card: "gap-3 rounded-xl border-l-4 p-4",
    banner: "gap-3 rounded-none border-b border-l-0 px-4 py-3",
    inline: "gap-2 rounded-lg border-l-2 px-3 py-2",
};
const LAYOUT_ICON_SIZE = {
    card: "size-5",
    banner: "size-5",
    inline: "size-4",
};
const LAYOUT_TITLE_TEXT = {
    card: "font-semibold text-foreground",
    banner: "font-semibold text-foreground",
    inline: "text-xs font-semibold text-foreground",
};
const LAYOUT_BODY_TEXT = {
    card: "text-sm text-foreground",
    banner: "text-sm text-foreground",
    inline: "text-xs text-foreground",
};
// Errors/urgent interruptions must interrupt (assertive); confirmations and
// non-urgent updates should not (polite) — derived from the same politeness map Toast
// uses, so the two components never drift on which variants are urgent.
function politenessToRole(politeness) {
    return politeness === "assertive" ? "alert" : "status";
}
export const Alert = forwardRef(function Alert(_a, ref) {
    var { className, variant = "info", layout = "card", title, children, icon, dismissible = false, onDismiss, action, role } = _a, props = __rest(_a, ["className", "variant", "layout", "title", "children", "icon", "dismissible", "onDismiss", "action", "role"]);
    const Icon = VARIANT_ICON[variant];
    return (_jsxs("div", Object.assign({ ref: ref, role: role !== null && role !== void 0 ? role : politenessToRole(VARIANT_POLITENESS[variant]), className: cn("flex", LAYOUT_BOX[layout], VARIANT_ACCENT_BORDER[variant], VARIANT_TINT_BG[variant], className) }, props, { children: [_jsx("span", { "aria-hidden": "true", className: cn("shrink-0", VARIANT_ACCENT_TEXT[variant]), children: icon !== null && icon !== void 0 ? icon : _jsx(Icon, { className: LAYOUT_ICON_SIZE[layout] }) }), _jsxs("div", { className: "min-w-0 flex-1 space-y-1", children: [title ? _jsx("p", { className: LAYOUT_TITLE_TEXT[layout], children: title }) : null, _jsx("div", { className: LAYOUT_BODY_TEXT[layout], children: children }), action ? _jsx("div", { className: "pt-1", children: action }) : null] }), dismissible ? (_jsx(Button, { iconOnly: true, tooltip: "Dismiss", variant: "ghost", size: "xs", onClick: onDismiss, className: "-m-1 shrink-0", children: _jsx(X, {}) })) : null] })));
});
