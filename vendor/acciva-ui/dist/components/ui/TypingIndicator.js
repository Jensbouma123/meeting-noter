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
const DOT_SIZE = {
    sm: "size-1.5",
    md: "size-2",
    lg: "size-2.5",
};
const DOT_GAP = {
    sm: "gap-1",
    md: "gap-1",
    lg: "gap-1.5",
};
// Timing comes from `--motion-typing-cycle` / `--motion-typing-stagger` (src/styles/base.css),
// the same values `AccivaTokens.Motion.typingCycle` / `typingStagger` emit on Apple.
const DOT_COUNT = 3;
export const TypingIndicator = forwardRef(function TypingIndicator(_a, ref) {
    var { label, size = "md", className } = _a, props = __rest(_a, ["label", "size", "className"]);
    return (_jsxs("div", Object.assign({ ref: ref, role: "status", className: cn("inline-flex items-center", DOT_GAP[size], className) }, props, { children: [_jsx("span", { className: "sr-only", children: label }), Array.from({ length: DOT_COUNT }, (_, index) => (_jsx("span", { "aria-hidden": "true", style: {
                    animationDuration: "var(--motion-typing-cycle)",
                    animationDelay: `calc(var(--motion-typing-stagger) * ${index})`,
                }, className: cn(
                // motion-reduce:opacity-60 is AccivaTokens.Opacity.typingStatic (TYPING_STATIC_OPACITY).
                "rounded-full bg-muted-foreground animate-pulse motion-reduce:animate-none motion-reduce:opacity-60", DOT_SIZE[size]) }, index)))] })));
});
