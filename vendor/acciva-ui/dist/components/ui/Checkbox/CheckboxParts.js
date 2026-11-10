import { jsx as _jsx } from "react/jsx-runtime";
import { Check, Minus } from "lucide-react";
import { cn } from "../../../lib/utils.js";
export function CheckboxIndicator({ checked, indeterminate }) {
    return (_jsx("span", { "aria-hidden": "true", className: cn("focus-within:outline-none flex size-5 items-center justify-center rounded-md border-2 border-border bg-background transition-colors", checked || indeterminate
            ? "hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-400 dark:active:bg-primary-300"
            : "hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2 dark:active:bg-elevation-3", "peer-checked:border-primary-500 peer-checked:bg-primary-500", "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500", (checked || indeterminate) && "border-primary-500 bg-primary-500"), children: indeterminate ? (_jsx(Minus, { className: "size-3.5 text-button-primary-foreground", strokeWidth: 3 })) : checked ? (_jsx(Check, { className: "size-3.5 text-button-primary-foreground", strokeWidth: 3 })) : null }));
}
