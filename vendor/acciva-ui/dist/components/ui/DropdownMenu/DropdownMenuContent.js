"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useArrowHint } from "../../../lib/use-arrow-hint.js";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { ArrowHint } from "../../../lib/ArrowHint.js";
import { useDropdownMenuContext } from "./DropdownMenuContext.js";
import { useDropdownMenuKeyboard } from "./useDropdownMenuKeyboard.js";
export const DropdownMenuContent = forwardRef(function DropdownMenuContent({ align = "start", sideOffset = 4, className, children, arrowHint, style, "aria-describedby": ariaDescribedBy, ...props }, ref) {
    const { open, setOpen, contentId, triggerId, anchorName } = useDropdownMenuContext("DropdownMenuContent");
    const menuRef = useRef(null);
    const hint = useArrowHint("dropdown-menu", arrowHint, "Use arrow keys to move between items");
    useImperativeHandle(ref, () => menuRef.current);
    // `popover="auto"` puts the menu in the top layer with light dismiss (outside press, Escape) and
    // anchor positioning follows the trigger, so there is no portal, measuring or outside-click listener.
    useEffect(() => {
        const menu = menuRef.current;
        if (!open || !menu)
            return;
        if (menu.showPopover && !menu.matches(":popover-open"))
            menu.showPopover();
        const onToggle = (e) => {
            if (e.newState === "closed")
                setOpen(false);
        };
        menu.addEventListener("toggle", onToggle);
        return () => menu.removeEventListener("toggle", onToggle);
    }, [open, setOpen]);
    const handleKeyDown = useDropdownMenuKeyboard(menuRef);
    if (!open)
        return null;
    return (_jsxs("div", { ref: menuRef, id: contentId, role: "menu", "aria-labelledby": triggerId, "aria-describedby": hint.describedBy(ariaDescribedBy), tabIndex: -1, onKeyDown: handleKeyDown, ...hint.groupProps, popover: "auto", "data-align": align, style: { positionAnchor: anchorName, "--dropdown-offset": `${sideOffset}px`, ...style }, className: cn("dropdown-menu min-w-44 p-1.5 text-foreground focus:outline-none", SURFACE_FILL.overlay, SURFACE_RADIUS.overlay, SURFACE_SHADOW.overlay, className), ...props, children: [children, _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible, className: "inset-x-1.5 top-auto bottom-1" })] }));
});
