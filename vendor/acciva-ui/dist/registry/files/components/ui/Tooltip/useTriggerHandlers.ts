import type { useLongPress } from "@/lib/use-long-press";
import type { TooltipChildProps } from "@/components/ui/Tooltip/types";

type Touch = ReturnType<typeof useLongPress>;
type Handler = (e: never) => void;

/**
 * Chains the trigger's own handlers in front of the tooltip's: hover/focus reveal it, and any
 * interaction that moves attention away (click, key, pointer down) hides it.
 */
export function useTriggerHandlers(
  childProps: TooltipChildProps,
  show: () => void,
  hide: () => void,
  leave: () => void,
  touch: Touch,
) {
  const own: Record<string, Handler> = {
    onMouseEnter: show,
    onFocus: show,
    onBlur: hide,
    onPointerDown: (e: React.PointerEvent) => {
      hide();
      touch.onPointerDown(e);
    },
    onPointerMove: touch.onPointerMove,
    onPointerUp: () => touch.onPointerUp(),
    onPointerCancel: () => touch.onPointerCancel(),
    onContextMenu: touch.onContextMenu,
    // The bubble is pointer-events: none (never blocks a neighbour); a short delay closes it (SC 1.4.13).
    onMouseLeave: leave,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow")) hide();
    },
  };
  const chained = Object.fromEntries(
    Object.entries(own).map(([name, fn]) => [
      name,
      (e: never) => {
        (childProps as Record<string, Handler | undefined>)[name]?.(e);
        fn(e);
      },
    ]),
  );
  return {
    ...chained,
    onClick: (e: React.MouseEvent) => {
      if (touch.consumeClick()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      childProps.onClick?.(e);
      hide();
    },
  };
}
