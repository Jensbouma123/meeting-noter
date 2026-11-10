"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "../ui/Button/index.js";
import { HStack } from "../ui/HStack.js";
import { Logo } from "../ui/Logo/index.js";
import { cn } from "../../lib/utils.js";
import { useThemeMode } from "../../lib/theme-mode.js";
import { NAV_IDLE, NO_SEARCH_ITEMS, PRIMARY_NAV_LINKS, resolveNavLinkActive } from "./NavHeader/NavHeaderData.js";
import { NavHeaderDrawer } from "./NavHeader/NavHeaderDrawer.js";
import { NavHeaderMenuToggle } from "./NavHeader/NavHeaderParts.js";
import { NavHeaderSearch } from "./NavHeader/NavHeaderSearch.js";
export function NavHeader({ logo, primaryLinks, actions, searchItems = NO_SEARCH_ITEMS, search = true, themeToggle = true, menu = true, startActions, homeHref = "/", brandLabel = "ACCIVA UI", } = {}) {
    const { toggleMode } = useThemeMode();
    const pathname = usePathname();
    const navLinks = primaryLinks ?? PRIMARY_NAV_LINKS;
    const [menuOpen, setMenuOpen] = useState(false);
    const drawerId = useId();
    // A route change dismisses the drawer. It is a transition derived from a changed
    // value, not a synchronisation with an external system, so it runs in the render
    // phase — an effect would paint the new route with the drawer still up for a frame
    // and trips `react-hooks/set-state-in-effect`.
    const [previousPathname, setPreviousPathname] = useState(pathname);
    if (previousPathname !== pathname) {
        setPreviousPathname(pathname);
        if (menuOpen)
            setMenuOpen(false);
    }
    return (_jsxs("header", { className: "sticky top-0 z-30 border-b border-border bg-background backdrop-blur-sm", children: [_jsxs(HStack, { spacing: "sm", className: "h-16 px-4 sm:gap-3 sm:px-6", children: [startActions, menu ? (_jsx(NavHeaderMenuToggle, { open: menuOpen, controls: drawerId, onToggle: () => setMenuOpen((open) => !open) })) : null, _jsx(Link, { href: homeHref, "aria-label": logo ? brandLabel : undefined, className: "focus-ring flex shrink-0 items-center rounded-md font-semibold text-foreground", children: logo ?? _jsx(Logo, { variant: "responsive", size: "md", "aria-label": brandLabel }) }), navLinks.length > 0 ? (_jsx("nav", { "aria-label": "Primary", className: "hidden lg:flex lg:items-center lg:gap-1", children: navLinks.map((link) => {
                            const active = resolveNavLinkActive(link, pathname);
                            return (_jsx(Link, { href: link.href, "aria-current": active ? "page" : undefined, className: cn("focus-ring rounded-md px-3 py-2 text-sm font-medium transition-colors motion-feedback", active
                                    ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                                    : NAV_IDLE), children: link.label }, link.href));
                        }) })) : null, _jsxs(HStack, { spacing: "sm", className: "ml-auto min-w-0", children: [search && searchItems.length > 0 ? _jsx(NavHeaderSearch, { items: searchItems }) : null, themeToggle ? (_jsxs(Button, { variant: "outline", size: "md", iconOnly: true, tooltip: "Toggle color theme", onClick: toggleMode, className: "touch-target-44", children: [_jsx(Moon, { className: "theme-icon-light" }), _jsx(Sun, { className: "theme-icon-dark" })] })) : null, actions] })] }), menu ? (_jsx(NavHeaderDrawer, { open: menuOpen, onOpenChange: setMenuOpen, id: drawerId, searchItems: searchItems, navLinks: navLinks, logo: logo, homeHref: homeHref, brandLabel: brandLabel, themeToggle: themeToggle })) : null] }));
}
