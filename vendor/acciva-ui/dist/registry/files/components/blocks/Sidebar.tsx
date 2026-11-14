"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
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

  return (
    <>
      <SidebarRail
        items={items}
        pathname={pathname}
        className={className}
        railRefs={railRefs}
        onReorder={onReorder}
        onMove={handleReorderMove}
        queueFocus={queueFocus}
      />

      {mobileNav ? (
        <SidebarDrawer
          items={items}
          pathname={pathname}
          mobileOpen={mobileOpen}
          onMobileClose={onMobileClose}
          drawerRefs={drawerRefs}
          queueFocus={queueFocus}
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
