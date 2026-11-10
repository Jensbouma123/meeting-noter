"use client";
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
import { Check } from "lucide-react";
import { createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useImperativeHandle, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { TEXT_SIZE } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
const DropdownMenuContext = createContext(null);
function useDropdownMenuContext(component) {
    const ctx = useContext(DropdownMenuContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within <DropdownMenu>`);
    }
    return ctx;
}
export function DropdownMenu({ open: controlledOpen, defaultOpen = false, onOpenChange, children, }) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const triggerRef = useRef(null);
    const baseId = useId();
    const contentId = `${baseId}-content`;
    const triggerId = `${baseId}-trigger`;
    const setOpen = useCallback((nextOpen) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange(nextOpen);
    }, [isControlled, onOpenChange]);
    return (_jsx(DropdownMenuContext.Provider, { value: {
            open,
            setOpen,
            triggerRef,
            contentId,
            triggerId,
        }, children: _jsx("div", { className: "relative inline-block text-left", children: children }) }));
}
function assignRef(ref, value) {
    if (!ref)
        return;
    if (typeof ref === "function") {
        ref(value);
    }
    else if (typeof ref === "object" && "current" in ref) {
        ref.current = value;
    }
}
const useIsMounted = () => {
    return typeof window !== "undefined";
};
export function DropdownMenuTrigger({ children }) {
    const { open, setOpen, triggerRef, contentId, triggerId } = useDropdownMenuContext("DropdownMenuTrigger");
    if (!isValidElement(children))
        return children;
    const child = children;
    const childProps = child.props;
    const Component = child.type;
    return (_jsx(Component, Object.assign({}, childProps, { ref: (node) => {
            triggerRef.current = node;
            assignRef(childProps.ref, node);
        }, id: triggerId, "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? contentId : undefined, onClick: (e) => {
            var _a;
            (_a = childProps.onClick) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            setOpen(!open);
        }, onKeyDown: (e) => {
            var _a;
            (_a = childProps.onKeyDown) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
            }
        } })));
}
export const DropdownMenuContent = forwardRef(function DropdownMenuContent(_a, ref) {
    var { align = "start", sideOffset = 4, className, children } = _a, props = __rest(_a, ["align", "sideOffset", "className", "children"]);
    const { open, setOpen, triggerRef, contentId, triggerId } = useDropdownMenuContext("DropdownMenuContent");
    const menuRef = useRef(null);
    const [coords, setCoords] = useState(null);
    const mounted = useIsMounted();
    useImperativeHandle(ref, () => menuRef.current);
    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !menuRef.current)
            return;
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const menuEl = menuRef.current;
        const menuWidth = menuEl.offsetWidth || 180;
        const menuHeight = menuEl.offsetHeight || 120;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        let top = triggerRect.bottom + sideOffset;
        if (top + menuHeight > viewportHeight - 8 && triggerRect.top - menuHeight - sideOffset > 8) {
            top = triggerRect.top - menuHeight - sideOffset;
        }
        let left = triggerRect.left;
        if (align === "end") {
            left = triggerRect.right - menuWidth;
        }
        else if (align === "center") {
            left = triggerRect.left + triggerRect.width / 2 - menuWidth / 2;
        }
        left = Math.max(8, Math.min(viewportWidth - menuWidth - 8, left));
        setCoords({ top, left });
    }, [triggerRef, align, sideOffset]);
    useEffect(() => {
        if (!open)
            return;
        updatePosition();
        const handleScrollOrResize = () => updatePosition();
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [open, updatePosition]);
    useEffect(() => {
        if (!open)
            return;
        const handlePointerDown = (event) => {
            const target = event.target;
            if (menuRef.current &&
                !menuRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open, setOpen, triggerRef]);
    useEffect(() => {
        if (!open || !menuRef.current)
            return;
        const firstItem = menuRef.current.querySelector('[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])');
        firstItem === null || firstItem === void 0 ? void 0 : firstItem.focus({ preventScroll: true });
    }, [open]);
    const handleKeyDown = (event) => {
        var _a, _b, _c, _d, _e;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
            return;
        }
        if (!menuRef.current)
            return;
        const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])'));
        if (items.length === 0)
            return;
        const currentIndex = items.findIndex((item) => item === document.activeElement);
        if (event.key === "ArrowDown") {
            event.preventDefault();
            const nextIndex = (currentIndex + 1) % items.length;
            (_b = items[nextIndex]) === null || _b === void 0 ? void 0 : _b.focus();
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            const nextIndex = (currentIndex - 1 + items.length) % items.length;
            (_c = items[nextIndex]) === null || _c === void 0 ? void 0 : _c.focus();
        }
        else if (event.key === "Home") {
            event.preventDefault();
            (_d = items[0]) === null || _d === void 0 ? void 0 : _d.focus();
        }
        else if (event.key === "End") {
            event.preventDefault();
            (_e = items[items.length - 1]) === null || _e === void 0 ? void 0 : _e.focus();
        }
        else if (event.key === "Tab") {
            setOpen(false);
        }
    };
    if (!open || !mounted)
        return null;
    return createPortal(_jsx("div", Object.assign({ ref: menuRef, id: contentId, role: "menu", "aria-labelledby": triggerId, tabIndex: -1, onKeyDown: handleKeyDown, style: {
            position: "fixed",
            top: coords ? `${coords.top}px` : "-9999px",
            left: coords ? `${coords.left}px` : "-9999px",
            zIndex: 50,
        }, className: cn("min-w-44 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-fade-in focus:outline-none", className) }, props, { children: children })), document.body);
});
const MENU_ITEM_TONE = {
    default: "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20",
    danger: "text-danger hover:bg-danger/10 focus-visible:bg-danger/10 active:bg-danger/15",
};
const MENU_ITEM_ICON_TONE = {
    default: "text-muted-foreground group-hover:text-current",
    danger: "text-danger",
};
export const DropdownMenuItem = forwardRef(function DropdownMenuItem(_a, ref) {
    var { variant, destructive = false, icon, className, children, onClick, disabled } = _a, props = __rest(_a, ["variant", "destructive", "icon", "className", "children", "onClick", "disabled"]);
    const resolvedVariant = variant !== null && variant !== void 0 ? variant : (destructive ? "danger" : "default");
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuItem");
    const handleClick = (e) => {
        var _a;
        if (disabled)
            return;
        onClick === null || onClick === void 0 ? void 0 : onClick(e);
        setOpen(false);
        (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    };
    return (_jsxs("button", Object.assign({ ref: ref, type: "button", role: "menuitem", disabled: disabled, "aria-disabled": disabled || undefined, tabIndex: -1, onClick: handleClick, className: cn("group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none", MENU_ITEM_TONE[resolvedVariant], disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent", className) }, props, { children: [icon ? (_jsx("span", { "aria-hidden": "true", className: cn("size-4 shrink-0", MENU_ITEM_ICON_TONE[resolvedVariant]), children: icon })) : null, _jsx("span", { className: "flex-1 text-left", children: children })] })));
});
export const DropdownMenuCheckboxItem = forwardRef(function DropdownMenuCheckboxItem(_a, ref) {
    var { checked, onCheckedChange, className, children, disabled } = _a, props = __rest(_a, ["checked", "onCheckedChange", "className", "children", "disabled"]);
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuCheckboxItem");
    const handleClick = () => {
        var _a;
        if (disabled)
            return;
        onCheckedChange(!checked);
        setOpen(false);
        (_a = triggerRef.current) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    };
    return (_jsxs("button", Object.assign({ ref: ref, type: "button", role: "menuitemcheckbox", "aria-checked": checked, disabled: disabled, "aria-disabled": disabled || undefined, tabIndex: -1, onClick: handleClick, className: cn("group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none", "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20", disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent", className) }, props, { children: [_jsx("span", { className: "flex size-4 shrink-0 items-center justify-center", children: checked ? _jsx(Check, { className: "size-4 text-primary-600 dark:text-primary-400" }) : null }), _jsx("span", { className: "flex-1 text-left", children: children })] })));
});
export const DropdownMenuSeparator = forwardRef(function DropdownMenuSeparator(_a, ref) {
    var { className } = _a, props = __rest(_a, ["className"]);
    return _jsx("div", Object.assign({ ref: ref, role: "separator", "aria-orientation": "horizontal", className: cn("-mx-1 my-1 h-px bg-border/80", className) }, props));
});
export const DropdownMenuLabel = forwardRef(function DropdownMenuLabel(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ ref: ref, role: "presentation", className: cn("px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", className) }, props, { children: children })));
});
export function DropdownMenuShortcut(_a) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("kbd", Object.assign({ className: cn("ml-auto font-mono tracking-widest text-muted-foreground opacity-70", TEXT_SIZE.xxs, className) }, props, { children: children })));
}
export const DropdownMenuGroup = forwardRef(function DropdownMenuGroup(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ ref: ref, role: "group", className: cn("space-y-0.5", className) }, props, { children: children })));
});
