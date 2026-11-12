import Link from "next/link";
import type { KeyboardEvent, RefObject } from "react";
import { Tooltip } from "@/components/ui/Tooltip/index";
import { VStack } from "@/components/ui/VStack";
import { SIDEBAR_RAIL_HEIGHT, STICKY_PANEL_TOP } from "@/lib/layout-tokens";
import { ICON_SIZE_CLASS } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { SidebarGlyph, SidebarReorderMenu } from "@/components/blocks/Sidebar/SidebarParts";
import { resolveActive } from "@/components/blocks/Sidebar/sidebarHelpers";
import type { SidebarItem, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function SidebarRail({
  items,
  pathname,
  className,
  railRefs,
  onReorder,
  onMove,
  onListKeyDown,
}: {
  items: SidebarItem[];
  pathname: string | null;
  className?: string;
  railRefs: RefObject<(HTMLAnchorElement | null)[]>;
  onReorder?: (move: SidebarReorderMove) => void;
  onMove: (from: number, to: number) => void;
  onListKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void;
}) {
  return (
    <aside
      className={cn(
        "hidden w-20 shrink-0 border-r border-border bg-surface lg:sticky lg:block lg:overflow-y-auto",
        STICKY_PANEL_TOP,
        SIDEBAR_RAIL_HEIGHT,
        className,
      )}
    >
      <VStack
        as="nav"
        aria-label="Primary navigation"
        spacing="sm"
        align="center"
        inset="md"
        className="h-full"
      >
        <VStack
          as="ul"
          spacing="sm"
          align="center"
          className="w-full"
          onKeyDown={onListKeyDown}
        >
          {items.map((item, index) => {
            const active = resolveActive(pathname, item);

            return (
              <li key={item.href} className="w-full">
                <Tooltip content={item.label} side="right">
                  <Link
                    ref={(node) => {
                      railRefs.current[index] = node;
                    }}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors motion-feedback",
                      active
                        ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                        : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"
                    )}
                  >
                    <SidebarGlyph icon={item.icon} className={cn(ICON_SIZE_CLASS.lg, "shrink-0")} />
                  </Link>
                </Tooltip>
                {onReorder && items.length > 1 && (
                  <div className="mt-2 flex justify-center">
                    <SidebarReorderMenu
                      label={item.label}
                      index={index}
                      total={items.length}
                      onMove={onMove}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </VStack>
      </VStack>
    </aside>
  );
}
