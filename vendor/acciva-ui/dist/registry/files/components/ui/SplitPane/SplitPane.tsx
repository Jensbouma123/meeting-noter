"use client";

import { cn } from "@/lib/utils";
import { Divider } from "@/components/ui/Divider";
import { SIDEBAR_WIDTH_CLASS, SIDEBAR_WIDTH_PX } from "@/components/ui/SplitPane/SplitPaneConstants";
import { SplitPaneSplitter } from "@/components/ui/SplitPane/SplitPaneParts";
import type { SplitPaneProps } from "@/components/ui/SplitPane/SplitPaneTypes";
import { useSideBySide } from "@/components/ui/SplitPane/useSideBySide";
import { useSplitterWidth } from "@/components/ui/SplitPane/useSplitterWidth";

export function SplitPane({
  header,
  sidebar,
  detail,
  defaultSidebarWidth = "md",
  resizable = false,
  splitterLabel = "Resize sidebar",
  onSidebarWidthChange,
  className,
  ...props
}: SplitPaneProps) {
  const sideBySide = useSideBySide();
  const { widthPx, handleKeyDown, handlePointerDown } = useSplitterWidth(
    defaultSidebarWidth,
    onSidebarWidthChange,
  );

  return (
    <div className={cn("flex w-full flex-col", className)} {...props}>
      {header ? (
        <>
          {header}
          <Divider />
        </>
      ) : null}
      <div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <div
          className={cn("w-full shrink-0", SIDEBAR_WIDTH_CLASS[defaultSidebarWidth])}
          style={
            resizable && sideBySide ? { width: widthPx } : undefined
          }
        >
          {sidebar}
        </div>
        {resizable ? (
          <>
            {/* Stacked base layout: a width handle is meaningless in one
                column, so the decorative rule stands in and the splitter only
                exists at the side-by-side breakpoint. */}
            <Divider className="md:hidden" />
            <SplitPaneSplitter
              widthPx={widthPx}
              label={splitterLabel}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
            />
          </>
        ) : (
          <>
            <Divider className="md:hidden" />
            <Divider orientation="vertical" className="hidden md:block" />
          </>
        )}
        <div className="min-w-0 flex-1">{detail}</div>
      </div>
    </div>
  );
}
