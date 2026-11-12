import type { ComponentType, ReactNode } from "react";

export type SidebarIcon = ComponentType<{ className?: string }> | ReactNode;

/**
 * A single-item reorder. `to` is the item's final index after the move. The sidebar
 * never reorders itself — the consumer applies the move to `items`.
 */
export interface SidebarReorderMove {
  from: number;
  to: number;
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: SidebarIcon;
  /**
   * Caller-supplied active state. When provided it wins over the
   * pathname-derived match, so a host can supply its own active-section
   * contract; when absent the current route decides.
   */
  isActive?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  /** Controls the off-canvas drawer's open state. Only meaningful while `mobileNav` is true. */
  mobileOpen?: boolean;
  /** Fired on backdrop click and any nav-link click. Only meaningful while `mobileNav` is true. */
  onMobileClose?: () => void;
  /** Set `false` to omit the built-in off-canvas mobile drawer entirely. Defaults to `true`. */
  mobileNav?: boolean;
  /** Extra classes merged onto the desktop rail `<aside>` — use to override the sticky offset or height. */
  className?: string;
  /**
   * Opts rows into reordering. Fires with `{from, to}` (`to` = final index) from the
   * per-row menu's Move up / Move down items (SC 2.5.7) or Alt+ArrowUp/Down on a
   * focused row (SC 2.1.1). Moves are announced politely (SC 4.1.3).
   */
  onReorder?: (move: SidebarReorderMove) => void;
}
