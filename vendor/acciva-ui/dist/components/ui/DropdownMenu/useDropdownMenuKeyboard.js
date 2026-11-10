import { useEffect, useRef } from "react";
import { useDropdownMenuContext } from "./DropdownMenuContext.js";
export function useDropdownMenuKeyboard(menuRef) {
    const { open, setOpen, triggerRef, openLastRef } = useDropdownMenuContext("DropdownMenuContent");
    const typeahead = useRef({ text: "", timer: 0 });
    useEffect(() => {
        if (!open || !menuRef.current)
            return;
        const enabled = menuRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])');
        (openLastRef.current ? enabled[enabled.length - 1] : enabled[0])?.focus({ preventScroll: true });
        openLastRef.current = false;
    }, [open, openLastRef, menuRef]);
    const handleKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
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
            items[nextIndex]?.focus();
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            const nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
            items[nextIndex]?.focus();
        }
        else if (event.key === "Home") {
            event.preventDefault();
            items[0]?.focus();
        }
        else if (event.key === "End") {
            event.preventDefault();
            items[items.length - 1]?.focus();
        }
        else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Type-ahead: a printable key (or a quick run of them) focuses the next item whose label starts with it.
            const ta = typeahead.current;
            window.clearTimeout(ta.timer);
            ta.text += event.key.toLowerCase();
            ta.timer = window.setTimeout(() => (ta.text = ""), 500);
            const start = ta.text.length === 1 ? currentIndex + 1 : Math.max(currentIndex, 0);
            const ordered = [...items.slice(start), ...items.slice(0, start)];
            ordered.find((item) => item.textContent?.trim().toLowerCase().startsWith(ta.text))?.focus();
        }
        else if (event.key === "Tab") {
            // The popover leaves the trigger's tab order: return focus to it so Tab continues from the trigger.
            setOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
        }
    };
    return handleKeyDown;
}
