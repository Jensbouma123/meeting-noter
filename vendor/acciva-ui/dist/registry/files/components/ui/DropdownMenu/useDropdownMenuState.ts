import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { DropdownMenuContextValue } from "@/components/ui/DropdownMenu/DropdownMenuContext";

export function useDropdownMenuState(
  controlledOpen: boolean | undefined,
  defaultOpen: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
): DropdownMenuContextValue {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const openLastRef = useRef(false);
  const baseId = useId();
  const contentId = `${baseId}-content`;
  const triggerId = `${baseId}-trigger`;
  const anchorName = `--dropdown-${baseId.replace(/[^\w-]/g, "")}`;
  const openAtPointerDownRef = useRef<boolean | null>(null);
  // Latest open state, updated eagerly so a light-dismiss `toggle` and the trigger `click` can't both report it.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === openRef.current) return;
      openRef.current = nextOpen;
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return { open, setOpen, triggerRef, contentId, triggerId, anchorName, openAtPointerDownRef, openLastRef };
}
