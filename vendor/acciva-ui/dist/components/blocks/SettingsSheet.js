"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { HStack } from "../../components/ui/HStack.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
import { useScrollLock } from "../../lib/scroll-lock.js";
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
export function SettingsSheet({ open, onClose, title, children }) {
    const containerRef = useRef(null);
    const panelRef = useRef(null);
    const previouslyFocused = useRef(null);
    const titleId = useId();
    // Shared reference-counted lock (`@/lib/scroll-lock`): freezes both <html>
    // and <body> with scrollbar-width compensation so the page behind the sheet
    // neither scrolls nor shifts. Safe to nest with Modal/Drawer.
    useScrollLock(open);
    useEffect(() => {
        var _a, _b;
        if (!open)
            return;
        previouslyFocused.current = document.activeElement;
        const firstFocusable = (_a = panelRef.current) === null || _a === void 0 ? void 0 : _a.querySelector(FOCUSABLE_SELECTOR);
        (_b = (firstFocusable !== null && firstFocusable !== void 0 ? firstFocusable : panelRef.current)) === null || _b === void 0 ? void 0 : _b.focus({ preventScroll: true });
        const wrapper = containerRef.current;
        const hiddenSiblings = [];
        if (wrapper) {
            Array.from(document.body.children).forEach((child) => {
                if (child === wrapper || !(child instanceof HTMLElement) || child.hasAttribute("inert"))
                    return;
                child.setAttribute("inert", "");
                hiddenSiblings.push(child);
            });
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape")
                onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            hiddenSiblings.forEach((el) => {
                el.removeAttribute("inert");
            });
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);
    if (!open)
        return null;
    return createPortal(_jsxs("div", { ref: containerRef, className: "fixed inset-0 z-50 flex justify-end sm:items-stretch", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 animate-fade-in", onClick: onClose, "aria-hidden": "true" }), _jsxs(VStack, { ref: panelRef, spacing: "lg", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, className: cn("relative z-10 h-full w-full max-w-sm border-l border-border bg-surface p-4 shadow-xl sm:p-6", "animate-fade-in overflow-y-auto"), children: [_jsxs(HStack, { spacing: "none", justify: "between", children: [_jsx("h2", { id: titleId, className: "text-lg font-semibold text-foreground", children: title }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Close settings", className: "focus-ring rounded-md p-2 text-muted-foreground transition-colors motion-feedback hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground active:scale-[0.99]", children: _jsx(X, { className: "size-5" }) })] }), _jsx(VStack, { spacing: "xl", children: children })] })] }), document.body);
}
