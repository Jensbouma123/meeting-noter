import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { useId } from "react";
import { ListItem } from "../../ui/ListItem.js";
import { VStack } from "../../ui/VStack.js";
/** The icon is decorative: the row's label already names the link (SC 1.1.1). */
export const navIcon = (item) => item.icon ? _jsx("span", { "aria-hidden": "true", children: item.icon }) : undefined;
export function NavTreeFlatList({ items, activeHref, labelledBy, }) {
    return (_jsx(VStack, { as: "ul", spacing: "xs", "aria-labelledby": labelledBy, children: items.map((item) => (_jsx("li", { children: _jsx(ListItem, { asChild: true, title: item.label, leading: navIcon(item), selected: item.href === activeHref, children: _jsx(Link, { href: item.href, children: item.label }) }) }, item.href))) }));
}
export function NavTreeSectionBlock({ section, activeHref }) {
    const headingId = useId();
    return (_jsxs(VStack, { spacing: "xs", children: [_jsx("h2", { id: headingId, className: "px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: section.heading }), _jsx(NavTreeFlatList, { items: section.items, activeHref: activeHref, labelledBy: headingId })] }));
}
