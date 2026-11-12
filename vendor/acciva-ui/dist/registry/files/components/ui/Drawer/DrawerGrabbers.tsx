import { cn } from "@/lib/utils";
import type { useDetentControl } from "@/components/ui/Drawer/useDetentControl";
import type { useDragResize } from "@/components/ui/Drawer/useDragResize";
import type { useSwipeDismiss } from "@/components/ui/Drawer/useSwipeDismiss";

function Grip({ isVertical }: { isVertical: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("rounded-full bg-muted-foreground", isVertical ? "h-1.5 w-10" : "h-10 w-1.5")}
    />
  );
}

interface DrawerHandleProps {
  isVertical: boolean;
  isPersistent: boolean;
  dragEnabled: boolean;
  orientation: "horizontal" | "vertical";
  label: string;
  valueText: string;
  valueMin: number;
  valueMax: number;
  valueNow: number;
  drag: ReturnType<typeof useDragResize>;
  keyboard: ReturnType<typeof useDetentControl>;
}

/** The resize slider: drags between detents, and steps them with the arrow keys. */
export function DrawerHandle({
  isVertical,
  isPersistent,
  dragEnabled,
  orientation,
  label,
  valueText,
  valueMin,
  valueMax,
  valueNow,
  drag,
  keyboard,
}: DrawerHandleProps) {
  return (
    <button
      type="button"
      role="slider"
      data-drawer-grabber
      aria-orientation={orientation}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      aria-valuetext={valueText}
      aria-label={label}
      onKeyDown={keyboard[5]}
      onClick={keyboard[6]}
      onPointerDown={drag[0]}
      onPointerMove={drag[1]}
      onPointerUp={drag[2]}
      onPointerCancel={drag[3]}
      className={cn(
        "focus-ring flex shrink-0 touch-none items-center justify-center",
        isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2",
        dragEnabled
          ? isVertical
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-col-resize"
          : "cursor-pointer",
        isPersistent && "px-11 md:cursor-pointer",
      )}
    >
      {/* The grip is the slider's only visual affordance, so it is a foreground mark and
          needs 3:1 against `bg-surface` (SC 1.4.11). `elevation-*` is a surface role —
          `elevation-4` lands at 1.06:1 on light and 1.31:1 on dark. */}
      <Grip isVertical={isVertical} />
    </button>
  );
}

interface DrawerSwipeGrabberProps {
  isVertical: boolean;
  isPersistent: boolean;
  label: string;
  onDismiss: () => void;
  swipe: ReturnType<typeof useSwipeDismiss>;
}

/** The standalone grabber for swipe-to-dismiss, used when no resize slider carries the flick. */
export function DrawerSwipeGrabber({ isVertical, isPersistent, label, onDismiss, swipe }: DrawerSwipeGrabberProps) {
  return (
    <button
      type="button"
      data-drawer-grabber
      aria-label={label}
      onClick={onDismiss}
      onPointerDown={swipe[0]}
      onPointerMove={swipe[1]}
      onPointerUp={swipe[2]}
      onPointerCancel={swipe[3]}
      className={cn(
        "focus-ring flex shrink-0 touch-none items-center justify-center",
        isVertical ? "min-h-11 w-full py-2" : "h-full min-w-11 px-2",
        "cursor-pointer",
        isPersistent && "px-11",
      )}
    >
      <Grip isVertical={isVertical} />
    </button>
  );
}
