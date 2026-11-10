"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { forwardRef, useEffect, useState } from "react";
import { HStack } from "../../components/ui/HStack.js";
import { VStack } from "../../components/ui/VStack.js";
import { TEXT_SIZE } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
function groupDomId(label) {
    return `nav-tree-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
function groupContainsHref(group, href) {
    if (!href)
        return false;
    return group.items.some((item) => { var _a, _b; return item.href === href || ((_b = (_a = item.children) === null || _a === void 0 ? void 0 : _a.some((child) => child.href === href)) !== null && _b !== void 0 ? _b : false); });
}
export const NavTree = forwardRef(function NavTree({ groups, items, activeHref, forceExpandAll, ariaLabel, "aria-label": ariaLabelAttr, "aria-describedby": ariaDescribedBy }, ref) {
    const accessibleName = ariaLabelAttr !== null && ariaLabelAttr !== void 0 ? ariaLabelAttr : ariaLabel;
    const groupList = groups !== null && groups !== void 0 ? groups : [];
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
        return (_jsx(VStack, { as: "nav", ref: ref, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", children: _jsx(VStack, { as: "ul", spacing: "xs", children: items.map((item) => {
                    const active = item.href === activeHref;
                    return (_jsx("li", { children: _jsx(Link, { href: item.href, "aria-current": active ? "page" : undefined, className: cn("focus-ring block truncate rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-feedback", active
                                ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"), children: item.label }) }, item.href));
                }) }) }));
    }
    return (
    // Separation grows outward, never inward: rows within a list clear each other by
    // `spacing="xs"`, a group header clears its own list by `spacing="sm"`, and one group
    // clears the next by `spacing="md"`. Every stop is a full step off the scale in [[styling]].
    _jsx(VStack, { as: "nav", ref: ref, "aria-label": accessibleName, "aria-describedby": ariaDescribedBy, spacing: "md", children: groupList.map((group) => {
            const isExpanded = forceExpandAll || expandedGroups.has(group.label);
            const groupId = groupDomId(group.label);
            return (_jsxs(VStack, { spacing: "sm", children: [_jsxs(HStack, { spacing: "sm", justify: "between", className: "pr-2", children: [_jsxs("button", { type: "button", "aria-expanded": isExpanded, "aria-controls": groupId, onClick: () => toggleGroup(group.label), className: "focus-ring text-foreground flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors motion-feedback hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", children: [_jsx("span", { className: "truncate", children: group.label }), _jsx(ChevronDown, { "aria-hidden": "true", className: cn("size-3.5 shrink-0 transition-transform duration-200", isExpanded && "rotate-180") })] }), group.count !== undefined && (_jsx("span", { className: cn("font-mono text-muted-foreground", TEXT_SIZE.xxs), children: group.count }))] }), _jsx(VStack, { id: groupId, hidden: !isExpanded, spacing: "xs", className: "ml-3 border-l border-border pl-3", children: group.items.map((item) => {
                            const isActive = item.href === activeHref;
                            return (_jsxs(VStack, { spacing: "xs", children: [_jsx(Link, { href: item.href, "aria-current": isActive ? "page" : undefined, className: cn("focus-ring block truncate rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-feedback", isActive
                                            ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                            : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"), children: item.label }), item.children && item.children.length > 0 && (_jsx(VStack, { spacing: "xs", className: "ml-3 border-l border-border pl-3", children: item.children.map((child) => {
                                            const isChildActive = child.href === activeHref;
                                            return (_jsx(Link, { href: child.href, "aria-current": isChildActive ? "page" : undefined, className: cn("focus-ring block truncate rounded-lg px-3 py-2 text-xs font-normal transition-colors motion-feedback", isChildActive
                                                    ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                                    : "text-muted-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 hover:text-foreground active:text-foreground"), children: child.label }, child.href));
                                        }) }))] }, item.href));
                        }) })] }, group.label));
        }) }));
});
