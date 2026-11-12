"use client";

import { cn } from "@/lib/utils";
import { BottomNavItemView } from "@/components/ui/BottomNav/BottomNavParts";
import { HIDE_AT_CLASSES, MAX_ITEMS, POSITION_CLASSES } from "@/components/ui/BottomNav/BottomNavClasses";
import type { BottomNavProps } from "@/components/ui/BottomNav/BottomNavTypes";
import { useBottomNavLifecycle } from "@/components/ui/BottomNav/useBottomNavLifecycle";

export function BottomNav({
  items,
  position = "fixed",
  hideAt = "md",
  className,
  "aria-label": ariaLabel,
}: BottomNavProps) {
  const navRef = useBottomNavLifecycle(items.length);

  const visibleItems = items.slice(0, MAX_ITEMS);

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel ?? "Primary"}
      className={cn(
        // `h-safe-nav` + `pb-safe` is what keeps `--safe-bottom-nav` truthful: the bar is
        // exactly `--bottom-nav-height` of content plus the home-indicator inset it pads
        // itself back over, which is the height Drawer and Toast anchor above (see [[pwa]]).
        "flex h-safe-nav border-t border-border bg-surface pb-safe",
        POSITION_CLASSES[position],
        HIDE_AT_CLASSES[hideAt],
        className,
      )}
    >
      <ul className="flex h-full w-full">
        {visibleItems.map((item) => (
          <BottomNavItemView key={item.href ?? item.label} item={item} />
        ))}
      </ul>
    </nav>
  );
}
