import Link from "next/link";
import { useId } from "react";
import { ListItem } from "@/components/ui/ListItem";
import { VStack } from "@/components/ui/VStack";
import type { NavTreeItem, NavTreeSection } from "@/components/blocks/NavTree/NavTreeTypes";

/** The icon is decorative: the row's label already names the link (SC 1.1.1). */
export const navIcon = (item: NavTreeItem) =>
  item.icon ? <span aria-hidden="true">{item.icon}</span> : undefined;

export function NavTreeFlatList({
  items,
  activeHref,
  labelledBy,
}: {
  items: NavTreeItem[];
  activeHref?: string;
  labelledBy?: string;
}) {
  return (
    <VStack as="ul" spacing="xs" aria-labelledby={labelledBy}>
      {items.map((item) => (
        <li key={item.href}>
          <ListItem asChild title={item.label} leading={navIcon(item)} selected={item.href === activeHref}>
            <Link href={item.href}>{item.label}</Link>
          </ListItem>
        </li>
      ))}
    </VStack>
  );
}

export function NavTreeSectionBlock({ section, activeHref }: { section: NavTreeSection; activeHref?: string }) {
  const headingId = useId();
  return (
    <VStack spacing="xs">
      {/* A real heading names its list (SC 1.3.1, 2.4.6); muted-foreground is full opacity (SC 1.4.3). */}
      <h2 id={headingId} className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {section.heading}
      </h2>
      <NavTreeFlatList items={section.items} activeHref={activeHref} labelledBy={headingId} />
    </VStack>
  );
}
