import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "../../ui/Drawer/index.js";
import { HStack } from "../../ui/HStack.js";
import { Logo } from "../../ui/Logo/index.js";
import { VStack } from "../../ui/VStack.js";
import { SURFACE_RADIUS } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { DRAWER_WIDTH_PX, navRowClass, resolveNavLinkActive } from "./NavHeaderData.js";
import { NavHeaderDrawerDocs } from "./NavHeaderDrawerDocs.js";
import { NavHeaderDrawerFooter } from "./NavHeaderDrawerFooter.js";
export function NavHeaderDrawer({ open, onOpenChange, id, searchItems, navLinks, logo, homeHref, brandLabel, themeToggle, }) {
    const pathname = usePathname();
    const closeMenu = () => onOpenChange(false);
    return (_jsx(Drawer, { open: open, onOpenChange: onOpenChange, modality: "modal", side: "left", maxSize: DRAWER_WIDTH_PX, handleLabel: "Navigation drawer width", "aria-label": "Primary navigation", children: _jsxs(VStack, { id: id, spacing: "xl", children: [_jsxs(HStack, { spacing: "sm", justify: "between", className: "-mx-4 -mt-4 border-b border-border px-4 py-2", children: [_jsx(Link, { href: homeHref, onClick: closeMenu, "aria-label": logo ? brandLabel : undefined, className: "focus-ring flex min-w-0 items-center rounded-md", children: logo ?? _jsx(Logo, { variant: "full", size: "md", "aria-label": brandLabel }) }), _jsx("button", { type: "button", onClick: closeMenu, "aria-label": "Close navigation menu", className: cn("touch-target-44 focus-ring flex size-11 shrink-0 items-center justify-center text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99]", SURFACE_RADIUS.control), children: _jsx(X, { className: "size-5" }) })] }), _jsxs(VStack, { as: "nav", "aria-label": "Mobile Navigation", spacing: "xl", children: [navLinks.length > 0 ? (_jsx(VStack, { as: "ul", spacing: "xs", children: navLinks.map((link) => {
                                const active = resolveNavLinkActive(link, pathname);
                                const Icon = link.icon;
                                return (_jsx("li", { children: _jsxs(Link, { href: link.href, onClick: closeMenu, "aria-current": active ? "page" : undefined, className: navRowClass(active, "gap-3 text-base font-medium"), children: [Icon ? (_jsx(Icon, { className: cn("size-5 shrink-0", active ? "text-primary-600 dark:text-primary-400" : "text-muted-foreground") })) : null, _jsx("span", { className: "truncate", children: link.label })] }) }, link.href));
                            }) })) : null, searchItems.length > 0 ? (_jsx(NavHeaderDrawerDocs, { items: searchItems, closeMenu: closeMenu })) : null] }), _jsx(NavHeaderDrawerFooter, { themeToggle: themeToggle })] }) }));
}
