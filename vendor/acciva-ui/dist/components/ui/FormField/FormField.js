"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cloneElement, forwardRef, isValidElement, useId, } from "react";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { FormDescription, FormLabel, FormMessage } from "./FormFieldParts.js";
import { FormFieldContext } from "./useFormField.js";
export const FormField = forwardRef(function FormField({ id: customId, label, hint, error, required = false, disabled = false, size = "md", className, children, ...props }, ref) {
    const generatedId = useId();
    const fieldId = customId ?? generatedId;
    const labelId = `${fieldId}-label`;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;
    const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;
    let renderedChild = children;
    if (isValidElement(children)) {
        const child = children;
        const existingDescribedBy = child.props["aria-describedby"];
        const mergedDescribedBy = [describedBy, existingDescribedBy].filter(Boolean).join(" ") || undefined;
        renderedChild = cloneElement(child, {
            id: child.props.id ?? fieldId,
            "aria-describedby": mergedDescribedBy,
            disabled: disabled || Boolean(child.props.disabled),
            required: required || Boolean(child.props.required),
        });
    }
    return (_jsx(FormFieldContext.Provider, { value: {
            id: fieldId,
            labelId,
            hintId,
            errorId,
            describedBy,
            error,
            hint: typeof hint === "string" ? hint : undefined,
            required,
            disabled,
            size,
        }, children: _jsxs(VStack, { ref: ref, spacing: "sm", className: cn("w-full", className), ...props, children: [label ? _jsx(FormLabel, { children: label }) : null, renderedChild, hint && !error ? _jsx(FormDescription, { children: hint }) : null, error ? _jsx(FormMessage, { children: error }) : null] }) }));
});
