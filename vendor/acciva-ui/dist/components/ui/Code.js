import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
const VARIANT_CLASS = {
    plain: "text-link-foreground",
    pill: "rounded border border-border bg-elevation-2 px-1.5 py-0.5 text-foreground",
};
export const Code = forwardRef(function Code({ variant = "plain", className, ...props }, ref) {
    return (_jsx("code", { ref: ref, className: cn("font-mono break-words", VARIANT_CLASS[variant], className), ...props }));
});
