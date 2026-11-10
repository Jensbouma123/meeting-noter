"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "../../components/ui/Button.js";
import { Modal } from "../../components/ui/Modal.js";
import { cn } from "../../lib/utils.js";
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText = "Confirm", cancelText = "Cancel", variant = "primary", loading = false, children, }) {
    const isDestructive = variant === "danger";
    const confirmButtonVariant = isDestructive
        ? "danger"
        : variant === "warning"
            ? "secondary"
            : "primary";
    const Icon = isDestructive ? AlertTriangle : Info;
    const titleWithIcon = (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { "aria-hidden": "true", className: cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isDestructive ? "bg-danger/10 text-danger" : "bg-primary-500/10 text-primary-600 dark:text-primary-400"), children: _jsx(Icon, { className: "size-4" }) }), _jsx("span", { children: title })] }));
    return (_jsx(Modal, { open: open, onClose: onClose, role: "alertdialog", size: "sm", title: titleWithIcon, description: description, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", disabled: loading, onClick: onClose, children: cancelText }), _jsx(Button, { variant: confirmButtonVariant, size: "sm", loading: loading, onClick: onConfirm, children: confirmText })] }), children: children }));
}
