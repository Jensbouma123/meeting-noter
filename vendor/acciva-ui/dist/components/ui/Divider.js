import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
/**
 * Inset pulls the rule in from the two ends of its own axis, so a horizontal
 * rule insets left/right and a vertical rule insets top/bottom.
 */
const INSET_MARGIN = {
    horizontal: {
        none: "",
        xxs: "mx-0.5",
        xs: "mx-1",
        sm: "mx-2",
        md: "mx-3",
        lg: "mx-4",
        xl: "mx-6",
        "2xl": "mx-8",
        "3xl": "mx-12",
    },
    vertical: {
        none: "",
        xxs: "my-0.5",
        xs: "my-1",
        sm: "my-2",
        md: "my-3",
        lg: "my-4",
        xl: "my-6",
        "2xl": "my-8",
        "3xl": "my-12",
    },
};
/**
 * `border-0` clears the Tailwind preflight `hr { border-top-width: 1px }` rule,
 * so the rule is exactly one `bg-border` pixel and never a doubled edge.
 */
const ORIENTATION_CLASS = {
    horizontal: "h-px w-full border-0",
    vertical: "w-px h-full self-stretch border-0",
};
const ARIA_ORIENTATION = {
    horizontal: "horizontal",
    vertical: "vertical",
};
export const Divider = forwardRef(function Divider({ orientation = "horizontal", inset = "none", decorative = true, className, ...props }, ref) {
    return (_jsx("hr", { ref: ref, "aria-hidden": decorative || undefined, role: decorative ? undefined : "separator", "aria-orientation": decorative ? undefined : ARIA_ORIENTATION[orientation], className: cn("bg-border", ORIENTATION_CLASS[orientation], INSET_MARGIN[orientation][inset], className), ...props }));
});
