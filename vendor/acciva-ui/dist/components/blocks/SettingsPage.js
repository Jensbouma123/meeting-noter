"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../../components/ui/Button.js";
import { Card } from "../../components/ui/Card.js";
import { Heading } from "../../components/ui/Heading.js";
import { HStack } from "../../components/ui/HStack.js";
import { Text } from "../../components/ui/Text.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function SettingsSection({ id, title, description, children, actions, variant = "default", className, }) {
    return (_jsx(Card, { id: id, variant: variant, className: cn("w-full p-4 sm:p-6", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(HStack, { justify: "between", align: "leading", wrap: true, children: [_jsxs(VStack, { spacing: "xs", children: [_jsx(Heading, { level: 2, size: "lg", children: title }), description && (_jsx(Text, { size: "sm", variant: "muted", children: description }))] }), actions && _jsx("div", { children: actions })] }), _jsx(VStack, { spacing: "md", className: "w-full", children: children })] }) }));
}
export function SettingsPage({ title, description, children, onSave, onCancel, isSaving = false, saveLabel = "Save changes", cancelLabel = "Cancel", actions, statusMessage, className, }) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave === null || onSave === void 0 ? void 0 : onSave(e);
    };
    return (_jsx("form", { onSubmit: handleSubmit, noValidate: true, className: cn("mx-auto w-full max-w-4xl", className), "aria-label": typeof title === "string" ? title : "Settings form", children: _jsxs(VStack, { spacing: "xl", children: [_jsxs(VStack, { spacing: "xs", children: [_jsx(Heading, { level: 1, size: "2xl", children: title }), description && (_jsx(Text, { size: "md", variant: "muted", children: description }))] }), statusMessage && (_jsx("div", { role: "status", "aria-live": "polite", className: cn("rounded-lg p-3 text-sm font-medium", statusMessage.type === "success" && "border border-success/20 bg-success/10 text-success", statusMessage.type === "error" && "border border-danger/20 bg-danger/10 text-danger", statusMessage.type === "warning" && "border border-warning/20 bg-warning/10 text-warning", statusMessage.type === "info" && "border border-primary-500/20 bg-primary-500/10 text-primary-700 dark:text-primary-300"), children: statusMessage.text })), _jsx(VStack, { spacing: "lg", className: "w-full", children: children }), actions !== undefined ? (actions) : ((onSave || onCancel) && (_jsxs(HStack, { spacing: "sm", justify: "trailing", className: "w-full border-t border-border pt-4", children: [onCancel && (_jsx(Button, { type: "button", variant: "outline", size: "md", onClick: onCancel, disabled: isSaving, children: cancelLabel })), onSave && (_jsx(Button, { type: "submit", variant: "primary", size: "md", loading: isSaving, children: saveLabel }))] })))] }) }));
}
SettingsPage.Section = SettingsSection;
