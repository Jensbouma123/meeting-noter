import { useEffect, useRef, useState, type RefObject } from "react";
import { useLongPress } from "@/lib/use-long-press";

/** Open state and its timers: hover/focus reveal after `delay`, press-and-hold for touch, and hide. */
export function useTooltipOpen(delay: number, longPress: boolean, triggerRef: RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOpenRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
      if (leaveRef.current) clearTimeout(leaveRef.current);
    };
  }, []);

  const show = () => {
    if (leaveRef.current) clearTimeout(leaveRef.current);
    const reveal = () => {
      // A trigger whose menu/popup is open (or just closing and returning focus) keeps the tooltip hidden
      // until hover/focus is renewed, so it never sits over the popup (SC 1.4.13).
      if (triggerRef.current?.getAttribute("aria-expanded") === "true") return;
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        setOpen(true);
      }
    };
    if (delay <= 0) {
      reveal();
      return;
    }
    timeoutRef.current = setTimeout(reveal, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    if (leaveRef.current) clearTimeout(leaveRef.current);
    touchOpenRef.current = false;
    setOpen(false);
  };

  // Hover-out closes after a short grace so a brief slip off the trigger doesn't flicker (SC 1.4.13).
  const leave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    leaveRef.current = setTimeout(hide, 100);
  };

  const touch = useLongPress(
    longPress,
    () => {
      touchOpenRef.current = true;
      setOpen(true);
    },
    // Auto-dismiss after release so the label stays readable but never lingers (SC 1.4.13).
    () => {
      dismissRef.current = setTimeout(hide, 1500);
    },
  );

  return [open, show, hide, leave, touch, touchOpenRef] as const;
}
