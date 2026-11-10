import { useCallback, useEffect, useId, useRef, useState } from "react";
export function useDropdownMenuState(controlledOpen, defaultOpen, onOpenChange) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const triggerRef = useRef(null);
    const openLastRef = useRef(false);
    const baseId = useId();
    const contentId = `${baseId}-content`;
    const triggerId = `${baseId}-trigger`;
    const anchorName = `--dropdown-${baseId.replace(/[^\w-]/g, "")}`;
    const openAtPointerDownRef = useRef(null);
    // Latest open state, updated eagerly so a light-dismiss `toggle` and the trigger `click` can't both report it.
    const openRef = useRef(open);
    useEffect(() => {
        openRef.current = open;
    }, [open]);
    const setOpen = useCallback((nextOpen) => {
        if (nextOpen === openRef.current)
            return;
        openRef.current = nextOpen;
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    }, [isControlled, onOpenChange]);
    return { open, setOpen, triggerRef, contentId, triggerId, anchorName, openAtPointerDownRef, openLastRef };
}
