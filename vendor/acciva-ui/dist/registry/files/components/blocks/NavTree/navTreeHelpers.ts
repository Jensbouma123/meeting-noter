import type { NavTreeGroup } from "@/components/blocks/NavTree/NavTreeTypes";

export function groupContainsHref(group: NavTreeGroup, href: string | undefined): boolean {
  if (!href) return false;
  return group.items.some(
    (item) => item.href === href || (item.children?.some((child) => child.href === href) ?? false),
  );
}
