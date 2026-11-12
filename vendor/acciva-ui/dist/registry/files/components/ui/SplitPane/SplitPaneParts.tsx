import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  SIDEBAR_MAX_PX,
  SIDEBAR_MIN_PX,
} from "@/components/ui/SplitPane/SplitPaneConstants";

interface SplitPaneSplitterProps {
  widthPx: number;
  label: string;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function SplitPaneSplitter({
  widthPx,
  label,
  onKeyDown,
  onPointerDown,
}: SplitPaneSplitterProps) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN_PX}
      aria-valuemax={SIDEBAR_MAX_PX}
      aria-valuenow={widthPx}
      aria-valuetext={`${widthPx} pixels`}
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className="focus-ring hidden w-6 shrink-0 cursor-col-resize touch-none items-center justify-center self-stretch md:flex"
    >
      {/*
        SC 2.5.8 Target Size (Minimum): the element above is a 24px
        hit area while the bar below stays a 4px visual, like the
        Slider thumb split.
      */}
      <span aria-hidden="true" className="h-8 w-1 rounded-full bg-border" />
    </div>
  );
}
