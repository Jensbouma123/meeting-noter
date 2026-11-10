"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowHint } from "../../lib/ArrowHint.js";
import { ListItem } from "../ui/ListItem.js";
import { VStack } from "../ui/VStack.js";
import { useArrowHint } from "../../lib/use-arrow-hint.js";
import { NavTreeGroupBlock } from "./NavTree/NavTreeParts.js";
import { groupContainsHref } from "./NavTree/navTreeHelpers.js";
export const NavTree = forwardRef(function NavTree({ groups, items, activeHref, forceExpandAll, ariaLabel, "aria-label": ariaLabelAttr, "aria-describedby": ariaDescribedByAttr, arrowHint }, ref) {
    const hint = useArrowHint("nav-tree", arrowHint, "Use arrow keys to move between links");
    const ariaDescribedBy = hint.describedBy(ariaDescribedByAttr);
    const navRef = useRef(null);
    // Up/Down hop between visible links and group toggles; Tab order is untouched (no roving tabindex).
    const handleArrows = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
            return;
        const stops = Array.from(navRef.current?.querySelectorAll("a[href], button") ?? []).filter((el) => !el.closest("[hidden]"));
        const at = stops.indexOf(document.activeElement);
        if (at === -1)
            return;
        event.preventDefault();
        stops[at + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
    };
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
    const [expandedGroups, setExpandedGroups] = useState(() => {
        const active = groupList.find((group) => groupContainsHref(group, activeHref));
        return active ? new Set([active.label]) : new Set();
    });
    useEffect(() => {
        const active = groupList.find((group) => groupContainsHref(group, activeHref));
        setExpandedGroups(active ? new Set([active.label]) : new Set());
        // Re-sync only when the active target changes, not on every groups re-render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeHref]);
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
        return (_jsxs(VStack, { as: "nav", ...navProps, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", className: "relative", children: [_jsx(VStack, { as: "ul", spacing: "xs", children: items.map((item) => {
                        const active = item.href === activeHref;
                        return (_jsx("li", { children: _jsx(ListItem, { asChild: true, title: item.label, selected: active, children: _jsx(Link, { href: item.href, children: item.label }) }) }, item.href));
                    }) }), _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible })] }));
    }
    return (
    // Separation grows outward, never inward: rows within a list clear each other by
    // `spacing="xs"`, a group header clears its own list by `spacing="sm"`, and one group
    // clears the next by `spacing="md"`. Every stop is a full step off the scale in [[styling]].
    _jsxs(VStack, { as: "nav", ...navProps, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", className: "relative", children: [groupList.map((group) => (_jsx(NavTreeGroupBlock, { group: group, activeHref: activeHref, isExpanded: forceExpandAll || expandedGroups.has(group.label), onToggle: () => toggleGroup(group.label) }, group.label))), _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible })] }));
});
