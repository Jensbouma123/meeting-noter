import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Eye, EyeOff, X } from "lucide-react";
import { ICON_SCALE_CLASS, INPUT_ICON_INSET_TRAILING, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
import { CLEAR_BUTTON_SIZE } from "./constants.js";
export function InputActions({ size, label, showClear, showPasswordToggle, trailingIcon, revealed, onClear, onToggleReveal, }) {
    if (!(showClear || showPasswordToggle || trailingIcon))
        return null;
    return (_jsxs(HStack, { spacing: "xs", className: cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET_TRAILING)), children: [showClear ? (_jsx("button", { type: "button", tabIndex: -1, "aria-label": label ? `Clear ${label}` : "Clear input", onClick: onClear, className: cn("focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3", resolveResponsive(size, CLEAR_BUTTON_SIZE), resolveResponsive(size, ICON_SCALE_CLASS)), children: _jsx(X, { className: "shrink-0" }) })) : null, showPasswordToggle ? (_jsx("button", { type: "button", "aria-label": revealed ? "Hide password" : "Show password", "aria-pressed": revealed, onClick: onToggleReveal, className: cn("focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3", resolveResponsive(size, CLEAR_BUTTON_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), typeof size === "string"
                    ? touchTargetClass(size)
                    : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                        ? TOUCH_TARGET_CLASS
                        : undefined), children: revealed ? _jsx(EyeOff, { className: "shrink-0" }) : _jsx(Eye, { className: "shrink-0" }) })) : null, trailingIcon ? (_jsx("span", { className: cn("pointer-events-none flex items-center justify-center", resolveResponsive(size, ICON_SCALE_CLASS)), children: trailingIcon })) : null] }));
}
