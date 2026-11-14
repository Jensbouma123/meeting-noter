import Link from "next/link";
import { useRef, type RefObject } from "react";
import { Drawer } from "@/components/ui/Drawer/index";
import { useCloseAtDesktop } from "@/components/blocks/Sidebar/useCloseAtDesktop";
import { ListItem } from "@/components/ui/ListItem";
import { VStack } from "@/components/ui/VStack";
import { ICON_SIZE_CLASS } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { SidebarGlyph, SidebarReorderMenu } from "@/components/blocks/Sidebar/SidebarParts";
import { useSidebarListKeys } from "@/components/blocks/Sidebar/useSidebarListKeys";
import { resolveActive } from "@/components/blocks/Sidebar/sidebarHelpers";
import type { SidebarItem, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function SidebarDrawer({
  items,
  pathname,
  mobileOpen,
  onMobileClose,
  drawerRefs,
  queueFocus,
  onReorder,
  onMove,
}: {
  items: SidebarItem[];
  pathname: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
  drawerRefs: RefObject<(HTMLAnchorElement | null)[]>;
  queueFocus: (list: "rail" | "drawer", index: number) => void;
  onReorder?: (move: SidebarReorderMove) => void;
  onMove: (from: number, to: number) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const onListKeyDown = useSidebarListKeys({ containerRef: listRef, list: "drawer", refs: drawerRefs, count: items.length, canReorder: !!onReorder, queueFocus, move: onMove });
  useCloseAtDesktop(mobileOpen, onMobileClose);
  return (
    <Drawer
      open={mobileOpen}
      onOpenChange={(next) => {
        if (!next) onMobileClose();
      }}
      side="left"
      defaultSize="16rem"
      swipeToDismiss={false}
      aria-label="Mobile navigation"
      className="lg:hidden"
    >
        <VStack as="nav" aria-label="Primary navigation" spacing="sm" inset="md" className="h-full">
          <VStack
            as="ul"
            spacing="sm"
            ref={listRef}
            onKeyDown={onListKeyDown}
          >
            {items.map((item, index) => {
              const active = resolveActive(pathname, item);

              return (
                <li key={item.href} className="flex items-center gap-1">
                  <ListItem
                    asChild
                    title={item.label}
                    selected={active}
                    leading={<SidebarGlyph icon={item.icon} className={cn(ICON_SIZE_CLASS.lg, "shrink-0")} />}
                    ref={(node) => {
                      drawerRefs.current[index] = node as HTMLAnchorElement | null;
                    }}
                    onClick={onMobileClose}
                    className="min-w-0 flex-1"
                  >
                    <Link href={item.href} />
                  </ListItem>
                  {onReorder && items.length > 1 && (
                    <SidebarReorderMenu
                      label={item.label}
                      index={index}
                      total={items.length}
                      onMove={onMove}
                    />
                  )}
                </li>
              );
            })}
          </VStack>
        </VStack>
    </Drawer>
  );
}
