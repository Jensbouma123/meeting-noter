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
import { Check, Minus } from "lucide-react";
import { forwardRef, useCallback, useId } from "react";
import { cn } from "../../lib/utils.js";
export const Checkbox = forwardRef(function Checkbox(_a, ref) {
    var { className, labelClassName, label, indeterminate = false, id, checked, disabled } = _a, props = __rest(_a, ["className", "labelClassName", "label", "indeterminate", "id", "checked", "disabled"]);
    const generatedId = useId();
    const checkboxId = id !== null && id !== void 0 ? id : generatedId;
    const attachRef = useCallback((node) => {
        if (node)
            node.indeterminate = indeterminate;
        if (typeof ref === "function")
            ref(node);
        else if (ref)
            ref.current = node;
    }, [indeterminate, ref]);
    return (_jsxs("label", { htmlFor: checkboxId, className: cn("inline-flex select-none items-center gap-2 text-sm text-foreground", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className), children: [_jsxs("span", { className: "relative inline-flex size-5 shrink-0 items-center justify-center", children: [_jsx("input", Object.assign({ ref: attachRef, type: "checkbox", id: checkboxId, checked: checked, disabled: disabled, "aria-checked": indeterminate ? "mixed" : checked, className: "peer sr-only" }, props)), _jsx("span", { "aria-hidden": "true", className: cn("focus-within:outline-none flex size-5 items-center justify-center rounded-md border-2 border-border bg-background transition-colors", checked || indeterminate
                            ? "hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-400 dark:active:bg-primary-300"
                            : "hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2 dark:active:bg-elevation-3", "peer-checked:border-primary-500 peer-checked:bg-primary-500", "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500", (checked || indeterminate) && "border-primary-500 bg-primary-500"), children: indeterminate ? (_jsx(Minus, { className: "size-3.5 text-button-primary-foreground", strokeWidth: 3 })) : checked ? (_jsx(Check, { className: "size-3.5 text-button-primary-foreground", strokeWidth: 3 })) : null })] }), label ? _jsx("span", { className: cn("font-medium", labelClassName), children: label }) : null] }));
});
