"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowHint } from "@/lib/ArrowHint";
import { ListItem } from "@/components/ui/ListItem";
import { VStack } from "@/components/ui/VStack";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { NavTreeGroupBlock } from "@/components/blocks/NavTree/NavTreeParts";
import { groupContainsHref } from "@/components/blocks/NavTree/navTreeHelpers";
import type { NavTreeProps } from "@/components/blocks/NavTree/NavTreeTypes";

export type {
  NavTreeAccessibleName,
  NavTreeBaseProps,
  NavTreeGroup,
  NavTreeItem,
  NavTreeProps,
} from "@/components/blocks/NavTree/NavTreeTypes";

export const NavTree = forwardRef<HTMLElement, NavTreeProps>(function NavTree(
  { groups, items, activeHref, forceExpandAll, ariaLabel, "aria-label": ariaLabelAttr, "aria-describedby": ariaDescribedByAttr, arrowHint },
  ref,
) {
  const hint = useArrowHint("nav-tree", arrowHint, "Use arrow keys to move between links");
  const ariaDescribedBy = hint.describedBy(ariaDescribedByAttr);
  const navRef = useRef<HTMLElement | null>(null);
  // Up/Down hop between visible links and group toggles; Tab order is untouched (no roving tabindex).
  const handleArrows = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const stops = Array.from(navRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []).filter(
      (el) => !el.closest("[hidden]"),
    );
    const at = stops.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    stops[at + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
  };
  const navProps = {
    ref: (node: HTMLElement | null) => {
      navRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    onKeyDown: handleArrows,
    ...hint.groupProps,
  };
  const accessibleName = ariaLabelAttr ?? ariaLabel;
  const groupList = groups ?? [];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = groupList.find((group) => groupContainsHref(group, activeHref));
    return active ? new Set([active.label]) : new Set();
  });

  useEffect(() => {
    const active = groupList.find((group) => groupContainsHref(group, activeHref));
    setExpandedGroups(active ? new Set([active.label]) : new Set());
    // Re-sync only when the active target changes, not on every groups re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (items) {
    return (
      <VStack as="nav" {...navProps} aria-label={accessibleName} aria-describedby={ariaDescribedBy} spacing="md" className="relative">
        <VStack as="ul" spacing="xs">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href}>
                <ListItem asChild title={item.label} selected={active}>
                  <Link href={item.href}>{item.label}</Link>
                </ListItem>
              </li>
            );
          })}
        </VStack>
        <ArrowHint id={hint.id} text={hint.text} visible={hint.visible} />
      </VStack>
    );
  }

  return (
    // Separation grows outward, never inward: rows within a list clear each other by
    // `spacing="xs"`, a group header clears its own list by `spacing="sm"`, and one group
    // clears the next by `spacing="md"`. Every stop is a full step off the scale in [[styling]].
    <VStack
      as="nav"
      {...navProps}
      aria-label={accessibleName}
      aria-describedby={ariaDescribedBy}
      spacing="md"
      className="relative"
    >
      {groupList.map((group) => (
        <NavTreeGroupBlock
          key={group.label}
          group={group}
          activeHref={activeHref}
          isExpanded={forceExpandAll || expandedGroups.has(group.label)}
          onToggle={() => toggleGroup(group.label)}
        />
      ))}
      <ArrowHint id={hint.id} text={hint.text} visible={hint.visible} />
    </VStack>
  );
});
