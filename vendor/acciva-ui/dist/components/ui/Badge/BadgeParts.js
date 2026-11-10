import { jsx as _jsx } from "react/jsx-runtime";
import { X } from "lucide-react";
import { resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { CHIP_DISMISS_SIZE } from "./classes.js";
export function BadgeDot({ className }) {
    return _jsx("span", { className: cn("size-1.5 rounded-full shrink-0", className) });
}
export function BadgeDismiss({ label, size, disabled, onDismiss, }) {
    return (_jsx("button", { type: "button", "aria-label": label, disabled: disabled, onClick: onDismiss, className: cn("focus-ring inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors motion-feedback hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3 active:text-foreground active:scale-99 disabled:cursor-not-allowed dark:hover:bg-elevation-3 dark:active:bg-elevation-4", resolveResponsive(size, CHIP_DISMISS_SIZE)), children: _jsx(X, { "aria-hidden": "true" }) }));
}
