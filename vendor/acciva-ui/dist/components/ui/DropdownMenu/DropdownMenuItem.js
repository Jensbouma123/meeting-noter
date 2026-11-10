"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { useDropdownMenuContext } from "./DropdownMenuContext.js";
const MENU_ITEM_TONE = {
    default: "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20",
    danger: "text-danger hover:bg-danger/10 focus-visible:bg-danger/10 active:bg-danger/15",
};
const MENU_ITEM_ICON_TONE = {
    default: "text-muted-foreground group-hover:text-current",
    danger: "text-danger",
};
export const DropdownMenuItem = forwardRef(function DropdownMenuItem({ variant, destructive = false, icon, className, children, onClick, disabled, ...props }, ref) {
    const resolvedVariant = variant ?? (destructive ? "danger" : "default");
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuItem");
    const handleClick = (e) => {
        if (disabled)
            return;
        onClick?.(e);
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
    };
    return (_jsxs("button", { ref: ref, type: "button", role: "menuitem", disabled: disabled, "aria-disabled": disabled || undefined, tabIndex: -1, onClick: handleClick, className: cn("group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none", MENU_ITEM_TONE[resolvedVariant], disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent", className), ...props, children: [icon ? (_jsx("span", { "aria-hidden": "true", className: cn("size-4 shrink-0", MENU_ITEM_ICON_TONE[resolvedVariant]), children: icon })) : null, _jsx("span", { className: "flex flex-1 items-center gap-4 text-left", children: children })] }));
});
export const DropdownMenuCheckboxItem = forwardRef(function DropdownMenuCheckboxItem({ checked, onCheckedChange, className, children, disabled, ...props }, ref) {
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuCheckboxItem");
    const handleClick = () => {
        if (disabled)
            return;
        onCheckedChange(!checked);
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
    };
    return (_jsxs("button", { ref: ref, type: "button", role: "menuitemcheckbox", "aria-checked": checked, disabled: disabled, "aria-disabled": disabled || undefined, tabIndex: -1, onClick: handleClick, className: cn("group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none", "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20", disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent", className), ...props, children: [_jsx("span", { className: "flex size-4 shrink-0 items-center justify-center", children: checked ? _jsx(Check, { className: "size-4 text-primary-600 dark:text-primary-400" }) : null }), _jsx("span", { className: "flex flex-1 items-center gap-4 text-left", children: children })] }));
});
