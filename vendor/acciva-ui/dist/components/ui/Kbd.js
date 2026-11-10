import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { TEXT_SIZE } from "../../lib/sizing-tokens/index.js";
export const Kbd = forwardRef(function Kbd({ className, ...props }, ref) {
    return (_jsx("kbd", { ref: ref, className: cn("inline-block rounded border border-border bg-elevation-2 px-2 py-0.5 font-mono leading-normal text-foreground", TEXT_SIZE.xxs, className), ...props }));
});
