"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ICON_SCALE_CLASS,
  TAB_PADDING,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { TAB_COVERED, TAB_EDGE, TAB_IDLE, TAB_SELECTED, TAB_SHAPE } from "@/components/ui/Tabs/tabsClasses";
import { useTabsContext } from "@/components/ui/Tabs/useTabsContext";

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, disabled, className }: TabProps) {
  const { value: activeValue, setValue, baseId, size, variant, orientation, draggable } = useTabsContext("Tab");
  const selected = value === activeValue;
  const tabShape = TAB_SHAPE[variant];

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      data-value={value}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={disabled ? -1 : 0}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        // min-h-6 is the SC 2.5.8 24px floor: at `xxs`/`sm` the tier's own padding
        // and text size add up to less than that, and tabs sit a couple of pixels
        // apart, so they cannot fall back on the spacing exception.
        orientation === "horizontal" && "relative shrink-0 snap-start whitespace-nowrap",
        // Selected tab is the drag handle: it yields horizontal pan to the drag, keeps vertical page scroll.
        selected && draggable && orientation === "horizontal" && "touch-pan-y",
        "focus-ring inline-flex min-h-6 items-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        tabShape ? resolveResponsive(size, tabShape) : undefined,
        TAB_EDGE[variant][orientation],
        "data-drag-target:text-foreground",
        resolveResponsive(size, TAB_PADDING),
        resolveResponsive(size, TEXT_SIZE),
        resolveResponsive(size, ICON_SCALE_CLASS),
        typeof size === "string"
          ? touchTargetClass(size)
          : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
            ? TOUCH_TARGET_CLASS
            : undefined,
        selected ? [TAB_SELECTED[variant], orientation === "horizontal" && TAB_COVERED[variant]] : TAB_IDLE[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The panel element stays mounted while inactive so the owning tab's
 * `aria-controls` always resolves; only its subtree is torn down. `hidden`
 * keeps the idle panel out of the accessibility tree and the tab order.
 */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

export function TabPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: activeValue, baseId } = useTabsContext("TabPanel");
  const selected = value === activeValue;
  const ref = useRef<HTMLDivElement>(null);
  const [hasFocusable, setHasFocusable] = useState(false);

  // APG: the panel is a tab stop only when it holds no focusable control (SC 2.1.1);
  // otherwise Tab goes straight to the first control and the container shows no ring.
  useEffect(() => {
    const el = ref.current;
    if (!el || !selected) return;
    const update = () => setHasFocusable(el.querySelector(FOCUSABLE) !== null);
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "tabindex", "href"] });
    return () => observer.disconnect();
  }, [selected]);

  return (
    <div
      ref={ref}
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      hidden={!selected}
      tabIndex={selected && !hasFocusable ? 0 : -1}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn("animate-fade-in", className)}
    >
      {selected ? children : null}
    </div>
  );
}
