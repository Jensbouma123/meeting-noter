import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollViewFadeProps {
  isHorizontal: boolean;
  active: boolean;
  hideControlsOnWrap: string;
}

interface ScrollViewArrowProps {
  isHorizontal: boolean;
  regionId: string;
  label: string;
  disabled: boolean;
  hoverOnly: boolean;
  autoHidden: boolean;
  hideControlsOnWrap: string;
  onClick: () => void;
}

export function ScrollViewStartFade({ isHorizontal, active, hideControlsOnWrap }: ScrollViewFadeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 transition-opacity motion-feedback",
        isHorizontal
          ? "left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-background to-transparent"
          : "top-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-b from-background to-transparent",
        active ? "opacity-100" : "opacity-0",
        hideControlsOnWrap,
      )}
    />
  );
}

export function ScrollViewEndFade({ isHorizontal, active, hideControlsOnWrap }: ScrollViewFadeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 transition-opacity motion-feedback",
        isHorizontal
          ? "right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-background to-transparent"
          : "bottom-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-background to-transparent",
        active ? "opacity-100" : "opacity-0",
        hideControlsOnWrap,
      )}
    />
  );
}

export function ScrollViewStartArrow({
  isHorizontal,
  regionId,
  label,
  disabled,
  hoverOnly,
  autoHidden,
  hideControlsOnWrap,
  onClick,
}: ScrollViewArrowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={regionId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring absolute z-20 flex size-8 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-surface hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0",
        isHorizontal
          ? "left-2 top-1/2 -translate-y-1/2"
          : "top-2 left-1/2 -translate-x-1/2",
        hoverOnly && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        autoHidden && "hidden",
        hideControlsOnWrap,
      )}
    >
      {isHorizontal ? <ChevronLeft className="size-4" /> : <ChevronUp className="size-4" />}
    </button>
  );
}

export function ScrollViewEndArrow({
  isHorizontal,
  regionId,
  label,
  disabled,
  hoverOnly,
  autoHidden,
  hideControlsOnWrap,
  onClick,
}: ScrollViewArrowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={regionId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring absolute z-20 flex size-8 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-surface hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0",
        isHorizontal
          ? "right-2 top-1/2 -translate-y-1/2"
          : "bottom-2 left-1/2 -translate-x-1/2",
        hoverOnly && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        autoHidden && "hidden",
        hideControlsOnWrap,
      )}
    >
      {isHorizontal ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
    </button>
  );
}
