import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { Button } from "../Button/index.js";
import { plural } from "./constants.js";
export function FileInputLabel({ label, required, inputId, textClass, }) {
    return label ? (
    // The asterisk sits outside <label> so the accessible name stays the bare label; `required`
    // on the native input conveys the state (SC 1.3.1, 4.1.2).
    _jsxs("span", { className: cn("font-medium text-foreground", textClass), children: [_jsx("label", { htmlFor: inputId, children: label }), required ? (_jsx("span", { "aria-hidden": "true", className: "ml-0.5 text-danger", children: "*" })) : null] })) : null;
}
export function FileInputActions({ variant, isAvatar, files, disabled, m, clearAll, removeAt, }) {
    return (_jsxs(_Fragment, { children: [variant === "compact" && files.length > 1 && !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", className: "self-start touch-target-44", onClick: clearAll, children: m.remove(plural(files.length)) })) : null, isAvatar && files.length > 0 && !disabled ? (_jsx(Button, { variant: "ghost", size: "sm", className: "touch-target-44", onClick: () => removeAt(0), children: m.remove(files[0].name) })) : null] }));
}
export function FileInputStatus({ acceptId, acceptText, error, errorId, hint, hintId, rejectionsId, rejections, }) {
    return (_jsxs(_Fragment, { children: [acceptId ? (_jsx("p", { id: acceptId, className: "text-xs text-muted-foreground", children: acceptText })) : null, error ? (errorId ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null) : hintId ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, rejectionsId ? (_jsx("ul", { id: rejectionsId, className: "flex flex-col gap-0.5 text-xs font-medium text-danger", children: rejections.map((r, i) => (_jsx("li", { className: "break-words", children: r.message }, i))) })) : null] }));
}
