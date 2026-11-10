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
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { Heading } from "./Heading.js";
import { INSET_PADDING, SPACING_GAP } from "./Stack.js";
const DESCRIPTION_TEXT = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-sm",
    "2xl": "text-base",
};
export const Section = forwardRef(function Section(_a, ref) {
    var { title, description, actions, level = 2, headerSize = "lg", spacing = "md", inset = "none", className, children } = _a, props = __rest(_a, ["title", "description", "actions", "level", "headerSize", "spacing", "inset", "className", "children"]);
    const headingId = props.id ? `${props.id}-heading` : undefined;
    const hasHeader = Boolean(title || description || actions);
    return (_jsxs("section", Object.assign({ ref: ref, className: cn("flex flex-col", SPACING_GAP[spacing], INSET_PADDING[inset], className), "aria-labelledby": title && headingId ? headingId : undefined }, props, { children: [hasHeader && (_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [Boolean(title || description) && (_jsxs("div", { className: "flex flex-col gap-1", children: [title && (_jsx(Heading, { id: headingId, level: level, size: headerSize, weight: "semibold", children: title })), description && (_jsx("p", { className: cn(DESCRIPTION_TEXT[headerSize], "text-muted-foreground"), children: description }))] })), actions && _jsx("div", { className: "flex items-center gap-2", children: actions })] })), children && _jsx("div", { children: children })] })));
});
