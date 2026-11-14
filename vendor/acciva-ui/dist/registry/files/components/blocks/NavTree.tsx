"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowHint } from "@/lib/ArrowHint";
import { useRovingFocus } from "@/components/ui/_internal/useRovingFocus";
import { VStack } from "@/components/ui/VStack";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { NavTreeFlatList, NavTreeSectionBlock } from "@/components/blocks/NavTree/NavTreeFlat";
import { NavTreeGroupBlock } from "@/components/blocks/NavTree/NavTreeParts";
import { groupContainsHref } from "@/components/blocks/NavTree/navTreeHelpers";
import type { NavTreeProps } from "@/components/blocks/NavTree/NavTreeTypes";

export type {
  NavTreeAccessibleName,
  NavTreeBaseProps,
  NavTreeGroup,
  NavTreeItem,
  NavTreeProps,
  NavTreeSection,
} from "@/components/blocks/NavTree/NavTreeTypes";

export const NavTree = forwardRef<HTMLElement, NavTreeProps>(function NavTree(
  { groups, items, sections, activeHref, forceExpandAll, ariaLabel, "aria-label": ariaLabelAttr, "aria-describedby": ariaDescribedByAttr, arrowHint },
  ref,
) {
  const hint = useArrowHint("nav-tree", arrowHint, "Use arrow keys to move between links");
  const ariaDescribedBy = hint.describedBy(ariaDescribedByAttr);
  const navRef = useRef<HTMLElement | null>(null);
  // Up/Down hop between visible links and group toggles; Tab order is untouched (no roving tabindex).
  const handleArrows = useRovingFocus({
    containerRef: navRef,
    itemSelector: "a[href]:not([hidden] *), button:not([hidden] *)",
    orientation: "vertical",
    wrap: false,
  });
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
  // Keyed by the label string, so a group that loads after mount still re-syncs, while
  // an unchanged active group does not re-run on every groups re-render.
  const activeGroupLabel = groupList.find((group) => groupContainsHref(group, activeHref))?.label;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(activeGroupLabel ? [activeGroupLabel] : []),
  );

  useEffect(() => {
    setExpandedGroups(new Set(activeGroupLabel ? [activeGroupLabel] : []));
  }, [activeHref, activeGroupLabel]);

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
        <NavTreeFlatList items={items} activeHref={activeHref} />
        <ArrowHint id={hint.id} text={hint.text} visible={hint.visible} />
      </VStack>
    );
  }

  if (sections) {
    return (
      <VStack as="nav" {...navProps} aria-label={accessibleName} aria-describedby={ariaDescribedBy} spacing="md" className="relative">
        {sections.map((section) => (
          <NavTreeSectionBlock key={section.heading} section={section} activeHref={activeHref} />
        ))}
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
