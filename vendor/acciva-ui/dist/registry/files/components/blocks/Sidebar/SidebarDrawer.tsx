import Link from "next/link";
import type { KeyboardEvent, RefObject } from "react";
import { Drawer } from "@/components/ui/Drawer/index";
import { VStack } from "@/components/ui/VStack";
import { ICON_SIZE_CLASS } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { SidebarGlyph, SidebarReorderMenu } from "@/components/blocks/Sidebar/SidebarParts";
import { resolveActive } from "@/components/blocks/Sidebar/sidebarHelpers";
import type { SidebarItem, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function SidebarDrawer({
  items,
  pathname,
  mobileOpen,
  onMobileClose,
  drawerRefs,
  onListKeyDown,
  onReorder,
  onMove,
}: {
  items: SidebarItem[];
  pathname: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
  drawerRefs: RefObject<(HTMLAnchorElement | null)[]>;
  onListKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void;
  onReorder?: (move: SidebarReorderMove) => void;
  onMove: (from: number, to: number) => void;
}) {
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
            onKeyDown={onListKeyDown}
          >
            {items.map((item, index) => {
              const active = resolveActive(pathname, item);

              return (
                <li key={item.href} className="flex items-center gap-1">
                  <Link
                    ref={(node) => {
                      drawerRefs.current[index] = node;
                    }}
                    href={item.href}
                    onClick={onMobileClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-feedback",
                      active
                        ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                        : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"
                    )}
                  >
                    <SidebarGlyph icon={item.icon} className={cn(ICON_SIZE_CLASS.lg, "shrink-0")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
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
