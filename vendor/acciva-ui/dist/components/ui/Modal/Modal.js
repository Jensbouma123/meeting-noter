"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "../Button/index.js";
import { SURFACE_RADIUS, SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { useModalLifecycle } from "./useModalLifecycle.js";
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
};
// Evaluated per render, never at module scope: the server has no HTMLDialogElement.
const supportsClosedBy = () => typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;
export function Modal({ open, onClose, title, description, children, footer, size = "md", confirmDismissal, role = "dialog", className, "aria-label": ariaLabel, }) {
    const dialogRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const mounted = useModalLifecycle(open, dialogRef);
    const requestClose = () => {
        if (confirmDismissal?.isDirty)
            setConfirmingDiscard(true);
        else
            onClose();
    };
    if (!mounted)
        return null;
    const discardPrompt = confirmDismissal ? (_jsx(Modal, { open: confirmingDiscard, onClose: () => setConfirmingDiscard(false), role: "alertdialog", size: "sm", title: confirmDismissal.title, description: confirmDismissal.message, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setConfirmingDiscard(false), children: confirmDismissal.keepLabel ?? "Keep editing" }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => {
                        setConfirmingDiscard(false);
                        onClose();
                    }, children: confirmDismissal.discardLabel ?? "Discard" })] }) })) : null;
    return (_jsxs("dialog", { ref: dialogRef, 
        // Implicit role="dialog" and modality come from showModal(); only the
        // alertdialog variant needs the explicit role (and aria-modal for the a11y audit).
        role: role === "alertdialog" ? role : undefined, "aria-modal": role === "alertdialog" ? "true" : undefined, tabIndex: -1, "aria-label": ariaLabel, "aria-labelledby": ariaLabel ? undefined : titleId, "aria-describedby": description ? descriptionId : undefined, closedby: "any", onCancel: (event) => {
            event.preventDefault();
            requestClose();
        }, 
        // Light dismiss for browsers without `closedby` (Safari): a click that lands on the
        // dialog element itself but outside its box is a backdrop click.
        onClick: supportsClosedBy()
            ? undefined
            : (event) => {
                if (event.target !== event.currentTarget)
                    return;
                const { top, left, right, bottom } = event.currentTarget.getBoundingClientRect();
                if (event.clientY < top || event.clientY > bottom || event.clientX < left || event.clientX > right) {
                    requestClose();
                }
            }, "data-open": open, className: cn("dialog-panel flex flex-col gap-4 focus-visible:outline-none border border-border bg-surface p-6 text-foreground motion-spatial ease-emphasized motion-reduce:transition-none", SURFACE_RADIUS.overlay, SURFACE_SHADOW.overlay, sizeClasses[size], className), children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { id: titleId, className: "text-lg font-semibold text-foreground", children: title }), description ? (_jsx("p", { id: descriptionId, className: "mt-1 text-sm text-muted-foreground", children: description })) : null] }), _jsx("button", { type: "button", onClick: requestClose, "aria-label": "Close dialog", "data-dialog-close": true, className: "focus-ring shrink-0 rounded-md p-1 text-muted-foreground transition-colors motion-feedback hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground active:scale-99", children: _jsx(X, { className: "size-5" }) })] }), children ? _jsx("div", { className: "text-sm text-foreground", children: children }) : null, footer ? _jsx("div", { className: "flex items-center justify-end gap-2 pt-2", children: footer }) : null, discardPrompt] }));
}
