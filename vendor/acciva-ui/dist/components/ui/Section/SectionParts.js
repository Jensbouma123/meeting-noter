import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { Heading } from "../Heading/index.js";
const DESCRIPTION_TEXT = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-sm",
    "2xl": "text-base",
};
export function SectionHeader({ title, description, actions, level, headerSize, headingId, }) {
    return (_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [Boolean(title || description) && (_jsxs("div", { className: "flex flex-col gap-1", children: [title && (_jsx(Heading, { id: headingId, level: level, size: headerSize, weight: "semibold", children: title })), description && (_jsx("p", { className: cn(DESCRIPTION_TEXT[headerSize], "text-muted-foreground"), children: description }))] })), actions && _jsx("div", { className: "flex items-center gap-2", children: actions })] }));
}
