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
import { cloneElement, createContext, forwardRef, isValidElement, useContext, useId, } from "react";
import { TEXT_SIZE, resolveResponsive } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { VStack } from "./VStack.js";
const FormFieldContext = createContext(null);
export function useFormField() {
    const ctx = useContext(FormFieldContext);
    if (!ctx) {
        throw new Error("useFormField must be used within a <FormField>");
    }
    return ctx;
}
export const FormField = forwardRef(function FormField(_a, ref) {
    var _b;
    var { id: customId, label, hint, error, required = false, disabled = false, size = "md", className, children } = _a, props = __rest(_a, ["id", "label", "hint", "error", "required", "disabled", "size", "className", "children"]);
    const generatedId = useId();
    const fieldId = customId !== null && customId !== void 0 ? customId : generatedId;
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
            id: (_b = child.props.id) !== null && _b !== void 0 ? _b : fieldId,
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
        }, children: _jsxs(VStack, Object.assign({ ref: ref, spacing: "sm", className: cn("w-full", className) }, props, { children: [label ? _jsx(FormLabel, { children: label }) : null, renderedChild, hint && !error ? _jsx(FormDescription, { children: hint }) : null, error ? _jsx(FormMessage, { children: error }) : null] })) }));
});
export const FormLabel = forwardRef(function FormLabel(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    const { id, labelId, required, disabled, size } = useFormField();
    return (_jsxs("label", Object.assign({ ref: ref, id: labelId, htmlFor: id, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE), disabled && "cursor-not-allowed opacity-60", className) }, props, { children: [children, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })));
});
export const FormDescription = forwardRef(function FormDescription(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    const { hintId } = useFormField();
    return (_jsx("p", Object.assign({ ref: ref, id: hintId, className: cn("text-xs text-muted-foreground", className) }, props, { children: children })));
});
export const FormMessage = forwardRef(function FormMessage(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    const { errorId, error } = useFormField();
    const message = children !== null && children !== void 0 ? children : error;
    if (!message)
        return null;
    return (_jsx("p", Object.assign({ ref: ref, id: errorId, role: "alert", className: cn("text-xs font-medium text-danger animate-fade-in", className) }, props, { children: message })));
});
export const FormGroup = forwardRef(function FormGroup(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx(VStack, Object.assign({ ref: ref, spacing: "lg", className: cn("sm:gap-6", className) }, props, { children: children })));
});
