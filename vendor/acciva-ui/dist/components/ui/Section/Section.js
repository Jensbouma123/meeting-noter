import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { INSET_PADDING, SPACING_GAP } from "../Stack/index.js";
import { SectionHeader } from "./SectionParts.js";
export const Section = forwardRef(function Section({ title, description, actions, level = 2, headerSize = "lg", spacing = "md", inset = "none", className, children, ...props }, ref) {
    const headingId = props.id ? `${props.id}-heading` : undefined;
    const hasHeader = Boolean(title || description || actions);
    return (_jsxs("section", { ref: ref, className: cn("flex flex-col", SPACING_GAP[spacing], INSET_PADDING[inset], className), "aria-labelledby": title && headingId ? headingId : undefined, ...props, children: [hasHeader && (_jsx(SectionHeader, { title: title, description: description, actions: actions, level: level, headerSize: headerSize, headingId: headingId })), children && _jsx("div", { children: children })] }));
});
