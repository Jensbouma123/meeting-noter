import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "../../ui/Card/index.js";
import { Heading } from "../../ui/Heading/index.js";
import { HStack } from "../../ui/HStack.js";
import { Text } from "../../ui/Text.js";
import { VStack } from "../../ui/VStack.js";
import { cn } from "../../../lib/utils.js";
export function SettingsSection({ id, title, description, children, actions, variant = "default", className, }) {
    return (_jsx(Card, { id: id, variant: variant, className: cn("w-full p-4 sm:p-6", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(HStack, { justify: "between", align: "leading", wrap: true, children: [_jsxs(VStack, { spacing: "xs", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), description && (_jsx(Text, { size: "sm", variant: "muted", children: description }))] }), actions && _jsx("div", { children: actions })] }), _jsx(VStack, { spacing: "md", className: "w-full", children: children })] }) }));
}
