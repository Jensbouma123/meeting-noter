"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { useFormField } from "./useFormField.js";
export const FormLabel = forwardRef(function FormLabel({ className, children, ...props }, ref) {
    const { id, labelId, required, disabled, size } = useFormField();
    return (_jsxs("label", { ref: ref, id: labelId, htmlFor: id, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE), disabled && "cursor-not-allowed opacity-60", className), ...props, children: [children, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] }));
});
export const FormDescription = forwardRef(function FormDescription({ className, children, ...props }, ref) {
    const { hintId } = useFormField();
    return (_jsx("p", { ref: ref, id: hintId, className: cn("text-xs text-muted-foreground", className), ...props, children: children }));
});
export const FormMessage = forwardRef(function FormMessage({ className, children, ...props }, ref) {
    const { errorId, error } = useFormField();
    const message = children ?? error;
    if (!message)
        return null;
    return (_jsx("p", { ref: ref, id: errorId, role: "alert", className: cn("text-xs font-medium text-danger animate-fade-in", className), ...props, children: message }));
});
export const FormGroup = forwardRef(function FormGroup({ className, children, ...props }, ref) {
    return (_jsx(VStack, { ref: ref, spacing: "lg", className: cn("sm:gap-6", className), ...props, children: children }));
});
