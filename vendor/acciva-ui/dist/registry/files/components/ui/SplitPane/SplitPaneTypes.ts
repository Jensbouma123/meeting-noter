import type { HTMLAttributes, ReactNode } from "react";

/** Sidebar width tier at the side-by-side breakpoint. */
export type SplitPaneSidebarWidth = "sm" | "md" | "lg";

/** `style` is not passed through (see SplitPane spec: no style passthrough). */
export interface SplitPaneProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  /** Full-width row above the panes; a divider is rendered below it automatically. */
  header?: ReactNode;
  /** Narrow pane: nav, filters, list. */
  sidebar: ReactNode;
  /** Main pane; flexes to fill and never squeezes the sidebar. */
  detail: ReactNode;
  /** Tier width of the sidebar from the `md` breakpoint up. */
  defaultSidebarWidth?: SplitPaneSidebarWidth;
  /** When true a focusable splitter replaces the decorative divider. */
  resizable?: boolean;
  /** Accessible name of the splitter handle. */
  splitterLabel?: string;
  /** Fires with the clamped pixel width after each keyboard step or drag update. */
  onSidebarWidthChange?: (width: number) => void;
}
