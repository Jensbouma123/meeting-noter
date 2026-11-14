import Link from "next/link";
import { useRef, type RefObject } from "react";
import { Tooltip } from "@/components/ui/Tooltip/index";
import { VStack } from "@/components/ui/VStack";
import { SIDEBAR_RAIL_HEIGHT, STICKY_PANEL_TOP } from "@/lib/layout-tokens";
import { ListItem } from "@/components/ui/ListItem";
import { ICON_SIZE_CLASS } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { SidebarGlyph, SidebarReorderMenu } from "@/components/blocks/Sidebar/SidebarParts";
import { useSidebarListKeys } from "@/components/blocks/Sidebar/useSidebarListKeys";
import { resolveActive } from "@/components/blocks/Sidebar/sidebarHelpers";
import type { SidebarItem, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function SidebarRail({
  items,
  pathname,
  className,
  railRefs,
  onReorder,
  onMove,
  queueFocus,
}: {
  items: SidebarItem[];
  pathname: string | null;
  className?: string;
  railRefs: RefObject<(HTMLAnchorElement | null)[]>;
  onReorder?: (move: SidebarReorderMove) => void;
  onMove: (from: number, to: number) => void;
  queueFocus: (list: "rail" | "drawer", index: number) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const onListKeyDown = useSidebarListKeys({ containerRef: listRef, list: "rail", refs: railRefs, count: items.length, canReorder: !!onReorder, queueFocus, move: onMove });
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
          ref={listRef}
          onKeyDown={onListKeyDown}
        >
          {items.map((item, index) => {
            const active = resolveActive(pathname, item);

            return (
              <li key={item.href} className="w-full">
                <Tooltip content={item.label} side="right">
                  <ListItem
                    asChild
                    density="rail"
                    title={item.label}
                    selected={active}
                    leading={<SidebarGlyph icon={item.icon} className={cn(ICON_SIZE_CLASS.lg, "shrink-0")} />}
                    ref={(node) => {
                      railRefs.current[index] = node as HTMLAnchorElement | null;
                    }}
                    className="mx-auto"
                  >
                    <Link href={item.href} />
                  </ListItem>
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
