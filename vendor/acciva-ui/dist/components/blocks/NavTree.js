"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowHint } from "../../lib/ArrowHint.js";
import { useRovingFocus } from "../ui/_internal/useRovingFocus.js";
import { VStack } from "../ui/VStack.js";
import { useArrowHint } from "../../lib/use-arrow-hint.js";
import { NavTreeFlatList, NavTreeSectionBlock } from "./NavTree/NavTreeFlat.js";
import { NavTreeGroupBlock } from "./NavTree/NavTreeParts.js";
import { groupContainsHref } from "./NavTree/navTreeHelpers.js";
export const NavTree = forwardRef(function NavTree({ groups, items, sections, activeHref, forceExpandAll, ariaLabel, "aria-label": ariaLabelAttr, "aria-describedby": ariaDescribedByAttr, arrowHint }, ref) {
    const hint = useArrowHint("nav-tree", arrowHint, "Use arrow keys to move between links");
    const ariaDescribedBy = hint.describedBy(ariaDescribedByAttr);
    const navRef = useRef(null);
    // Up/Down hop between visible links and group toggles; Tab order is untouched (no roving tabindex).
    const handleArrows = useRovingFocus({
        containerRef: navRef,
        itemSelector: "a[href]:not([hidden] *), button:not([hidden] *)",
        orientation: "vertical",
        wrap: false,
    });
    const navProps = {
        ref: (node) => {
            navRef.current = node;
            if (typeof ref === "function")
                ref(node);
            else if (ref)
                ref.current = node;
        },
        onKeyDown: handleArrows,
        ...hint.groupProps,
    };
    const accessibleName = ariaLabelAttr ?? ariaLabel;
    const groupList = groups ?? [];
    // Keyed by the label string, so a group that loads after mount still re-syncs, while
    // an unchanged active group does not re-run on every groups re-render.
    const activeGroupLabel = groupList.find((group) => groupContainsHref(group, activeHref))?.label;
    const [expandedGroups, setExpandedGroups] = useState(() => new Set(activeGroupLabel ? [activeGroupLabel] : []));
    useEffect(() => {
        setExpandedGroups(new Set(activeGroupLabel ? [activeGroupLabel] : []));
    }, [activeHref, activeGroupLabel]);
    const toggleGroup = (label) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(label))
                next.delete(label);
            else
                next.add(label);
            return next;
        });
    };
    if (items) {
        return (_jsxs(VStack, { as: "nav", ...navProps, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", className: "relative", children: [_jsx(NavTreeFlatList, { items: items, activeHref: activeHref }), _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible })] }));
    }
    if (sections) {
        return (_jsxs(VStack, { as: "nav", ...navProps, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", className: "relative", children: [sections.map((section) => (_jsx(NavTreeSectionBlock, { section: section, activeHref: activeHref }, section.heading))), _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible })] }));
    }
    return (
    // Separation grows outward, never inward: rows within a list clear each other by
    // `spacing="xs"`, a group header clears its own list by `spacing="sm"`, and one group
    // clears the next by `spacing="md"`. Every stop is a full step off the scale in [[styling]].
    _jsxs(VStack, { as: "nav", ...navProps, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", className: "relative", children: [groupList.map((group) => (_jsx(NavTreeGroupBlock, { group: group, activeHref: activeHref, isExpanded: forceExpandAll || expandedGroups.has(group.label), onToggle: () => toggleGroup(group.label) }, group.label))), _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible })] }));
});
