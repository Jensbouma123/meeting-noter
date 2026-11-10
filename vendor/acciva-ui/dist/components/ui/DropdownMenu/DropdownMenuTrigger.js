"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { isValidElement } from "react";
import { useDropdownMenuContext } from "./DropdownMenuContext.js";
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
export function DropdownMenuTrigger({ children }) {
    const { open, setOpen, triggerRef, contentId, triggerId, anchorName, openAtPointerDownRef, openLastRef } = useDropdownMenuContext("DropdownMenuTrigger");
    if (!isValidElement(children))
        return children;
    const child = children;
    const childProps = child.props;
    const Component = child.type;
    return (_jsx(Component, { ...childProps, ref: (node) => {
            triggerRef.current = node;
            assignRef(childProps.ref, node);
        }, id: triggerId, "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? contentId : undefined, style: { ...childProps.style, anchorName }, onPointerDown: (e) => {
            childProps.onPointerDown?.(e);
            openAtPointerDownRef.current = open;
        }, onClick: (e) => {
            childProps.onClick?.(e);
            // A pointer press on the trigger of an open menu already light-dismissed it: don't reopen.
            const wasOpen = openAtPointerDownRef.current ?? open;
            openAtPointerDownRef.current = null;
            setOpen(!wasOpen);
        }, onKeyDown: (e) => {
            childProps.onKeyDown?.(e);
            if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLastRef.current = e.key === "ArrowUp";
                setOpen(true);
            }
        } }));
}
