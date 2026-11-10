"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback } from "react";
import { cn } from "../../../lib/utils.js";
import { CheckboxIndicator } from "./CheckboxParts.js";
import { useCheckboxId } from "./useCheckbox.js";
export const Checkbox = forwardRef(function Checkbox({ className, labelClassName, label, indeterminate = false, id, checked, disabled, onKeyDown, ...props }, ref) {
    const checkboxId = useCheckboxId(id);
    const attachRef = useCallback((node) => {
        if (node)
            node.indeterminate = indeterminate;
        if (typeof ref === "function")
            ref(node);
        else if (ref)
            ref.current = node;
    }, [indeterminate, ref]);
    return (_jsxs("label", { htmlFor: checkboxId, className: cn("inline-flex select-none items-center gap-2 text-sm text-foreground", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className), children: [_jsxs("span", { className: "relative inline-flex size-5 shrink-0 items-center justify-center", children: [_jsx("input", { ref: attachRef, type: "checkbox", id: checkboxId, checked: checked, disabled: disabled, "aria-checked": indeterminate ? "mixed" : checked, className: "peer sr-only", onKeyDown: (event) => {
                            onKeyDown?.(event);
                            if (event.key !== "Enter")
                                return;
                            event.preventDefault();
                            event.currentTarget.click();
                        }, ...props }), _jsx(CheckboxIndicator, { checked: checked, indeterminate: indeterminate })] }), label ? _jsx("span", { className: cn("font-medium", labelClassName), children: label }) : null] }));
});
