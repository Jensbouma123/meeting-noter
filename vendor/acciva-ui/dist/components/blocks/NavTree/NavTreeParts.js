import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { HStack } from "../../ui/HStack.js";
import { ListItem } from "../../ui/ListItem.js";
import { Text } from "../../ui/Text.js";
import { VStack } from "../../ui/VStack.js";
import { cn } from "../../../lib/utils.js";
import { groupDomId } from "./navTreeHelpers.js";
export function NavTreeGroupBlock({ group, activeHref, isExpanded, onToggle }) {
    const groupId = groupDomId(group.label);
    return (_jsxs(VStack, { spacing: "sm", children: [_jsxs(HStack, { spacing: "sm", justify: "between", className: "pr-2", children: [_jsxs("button", { type: "button", "aria-expanded": isExpanded, "aria-controls": groupId, onClick: onToggle, className: "focus-ring text-foreground flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors motion-feedback hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", children: [_jsx(Text, { as: "span", size: "sm", weight: "semibold", truncate: true, children: group.label }), _jsx(ChevronDown, { "aria-hidden": "true", className: cn("size-3.5 shrink-0 transition-transform duration-200", isExpanded && "rotate-180") })] }), group.count !== undefined && (_jsx(Text, { as: "span", size: "xxs", font: "mono", variant: "muted", children: group.count }))] }), _jsx(VStack, { id: groupId, hidden: !isExpanded, spacing: "xs", className: "ml-3 border-l border-border pl-3", children: group.items.map((item) => {
                    const isActive = item.href === activeHref;
                    return (_jsxs(VStack, { spacing: "xs", children: [_jsx(ListItem, { asChild: true, title: item.label, selected: isActive, children: _jsx(Link, { href: item.href, children: item.label }) }), item.children && item.children.length > 0 && (_jsx(VStack, { spacing: "xs", className: "ml-3 border-l border-border pl-3", children: item.children.map((child) => {
                                    const isChildActive = child.href === activeHref;
                                    return (_jsx(Link, { href: child.href, "aria-current": isChildActive ? "page" : undefined, className: cn("focus-ring block truncate rounded-lg px-3 py-2 text-xs font-normal transition-colors motion-feedback", isChildActive
                                            ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                            : "text-muted-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 hover:text-foreground active:text-foreground"), children: child.label }, child.href));
                                }) }))] }, item.href));
                }) })] }));
}
