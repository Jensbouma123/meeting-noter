"use client";

import { usePathname } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import { SidebarDrawer } from "@/components/blocks/Sidebar/SidebarDrawer";
import { SidebarRail } from "@/components/blocks/Sidebar/SidebarRail";
import type { SidebarProps } from "@/components/blocks/Sidebar/SidebarTypes";
import { useSidebarReorder } from "@/components/blocks/Sidebar/useSidebarReorder";

export type { SidebarIcon, SidebarItem, SidebarProps, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function Sidebar({
  items,
  mobileOpen = false,
  onMobileClose = () => {},
  mobileNav = true,
  className,
  onReorder,
}: SidebarProps) {
  const pathname = usePathname();
  const railRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const drawerRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { queueFocus, visibleReorderNote, handleReorderMove } = useSidebarReorder({
    items,
    onReorder,
    railRefs,
    drawerRefs,
  });

  /**
   * Arrow keys move focus directly between rail items; every link stays in the
   * natural tab order (no tabIndex={-1}) since the project's own a11y audit
   * only permits removing a `role="link"` from tab order inside a composite
   * widget role (tab/option/menuitem/...), which a real navigation link isn't.
   * Alt+ArrowUp/Down reorders the focused row (SC 2.1.1) in either rendering.
   */
  const handleListKeyDown = (list: "rail" | "drawer", event: KeyboardEvent<HTMLUListElement>) => {
    const refs = list === "rail" ? railRefs.current : drawerRefs.current;
    const current = refs.findIndex((node) => node === document.activeElement);
    if (current === -1) return;
    if (onReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      const to = event.key === "ArrowUp" ? current - 1 : current + 1;
      if (to < 0 || to >= items.length) return;
      event.preventDefault();
      queueFocus(list, to);
      handleReorderMove(current, to);
      return;
    }
    if (list === "drawer") return;
    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = (current + 1) % items.length;
        break;
      case "ArrowUp":
        nextIndex = (current - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    railRefs.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <>
      <SidebarRail
        items={items}
        pathname={pathname}
        className={className}
        railRefs={railRefs}
        onReorder={onReorder}
        onMove={handleReorderMove}
        onListKeyDown={(event) => handleListKeyDown("rail", event)}
      />

      {mobileNav ? (
        <SidebarDrawer
          items={items}
          pathname={pathname}
          mobileOpen={mobileOpen}
          onMobileClose={onMobileClose}
          drawerRefs={drawerRefs}
          onListKeyDown={(event) => handleListKeyDown("drawer", event)}
          onReorder={onReorder}
          onMove={handleReorderMove}
        />
      ) : null}

      {onReorder ? (
        <span role="status" aria-live="polite" className="sr-only">
          {visibleReorderNote}
        </span>
      ) : null}
    </>
  );
}
