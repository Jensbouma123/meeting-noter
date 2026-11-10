import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BADGE_GAP, BADGE_TEXT, resolveResponsive, } from "../../lib/sizing-tokens/index.js";
import { cn } from "../../lib/utils.js";
const toneClasses = {
    neutral: "bg-muted-foreground",
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    brand: "bg-primary-500",
};
// Dot diameters on the default spacing scale (6px–24px), mirroring the Swift
// `AccivaStatusDot.diameter(for:)` multiples of `Spacing.unit`.
const DOT_SIZE = {
    xxs: "size-1.5",
    xs: "size-2",
    sm: "size-2.5",
    md: "size-3",
    lg: "size-3.5",
    xl: "size-4",
    "2xl": "size-5",
    "3xl": "size-6",
};
/**
 * A small presence/status dot with a required accessible name. `role="img"` names it via
 * `aria-label`; the dot (and the optional visible label text) are presentational children,
 * so the name announces exactly once (SC 4.1.2). Not a control — never attach `onClick`.
 */
export function StatusDot({ tone = "neutral", label, size = "xs", pulse = false, showLabel = false, className, ...props }) {
    return (_jsxs("span", { role: "img", "aria-label": label, className: cn("inline-flex shrink-0 items-center", showLabel && [
            resolveResponsive(size, BADGE_GAP),
            resolveResponsive(size, BADGE_TEXT),
            "font-medium text-muted-foreground",
        ], className), ...props, children: [pulse ? (_jsxs("span", { className: "relative inline-flex shrink-0", children: [_jsx("span", { "aria-hidden": "true", 
                        // Ring peak is PULSE_PEAK_OPACITY (opacity-tokens); spelled as a literal
                        // so Tailwind compiles it verbatim.
                        className: cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none", toneClasses[tone]) }), _jsx("span", { "aria-hidden": "true", className: cn("relative inline-flex rounded-full", resolveResponsive(size, DOT_SIZE), toneClasses[tone]) })] })) : (_jsx("span", { "aria-hidden": "true", className: cn("inline-flex shrink-0 rounded-full", resolveResponsive(size, DOT_SIZE), toneClasses[tone]) })), showLabel && (_jsx("span", { "aria-hidden": "true", className: "truncate", children: label }))] }));
}
