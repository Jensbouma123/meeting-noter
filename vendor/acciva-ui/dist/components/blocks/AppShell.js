import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HStack } from "../ui/HStack.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
import { NavHeader } from "./NavHeader.js";
const MAIN_PADDING = "p-4 sm:p-6 lg:p-8";
// With a bar, the bottom padding clears `--safe-bottom-nav` + `--bottom-nav-drawer-peek` and
// `bottomNavHideAt` hands it back to the plain padding at the bar's breakpoint (mobile-first).
const MAIN_PADDING_WITH_NAV = "px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 pb-safe-nav-drawer scroll-pb-safe-nav-drawer";
export const NAV_HIDE_PADDING = {
    never: "",
    sm: "sm:pb-6 sm:scroll-pb-0 lg:pb-8",
    md: "md:pb-6 md:scroll-pb-0 lg:pb-8",
    lg: "lg:pb-8 lg:scroll-pb-0",
    xl: "xl:pb-8 xl:scroll-pb-0",
};
export const MAIN_ID = "main";
/** First tab stop: jumps past the header/nav to `<main id="main">` (SC 2.4.1). */
export function SkipLink() {
    return (_jsx("a", { href: `#${MAIN_ID}`, className: "focus-ring sr-only rounded-md bg-surface px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50", children: "Skip to main content" }));
}
export function AppShell({ children, header, searchItems, sidebar, startAside, endAside, skipLink = true, bottomNav, bottomDrawer, bottomNavHideAt = "md", }) {
    const resolvedStartAside = startAside ?? sidebar;
    const hasAside = Boolean(resolvedStartAside || endAside);
    const main = (_jsx("main", { id: MAIN_ID, tabIndex: -1, className: cn("flex-1 focus:outline-none", bottomNav ? [MAIN_PADDING_WITH_NAV, NAV_HIDE_PADDING[bottomNavHideAt]] : MAIN_PADDING, hasAside ? "min-w-0" : undefined), children: children }));
    return (_jsxs(VStack, { spacing: "none", className: "min-h-screen bg-background", children: [skipLink ? _jsx(SkipLink, {}) : null, header ?? _jsx(NavHeader, { searchItems: searchItems }), hasAside ? (_jsxs(HStack, { spacing: "none", align: "stretch", className: "min-h-0 flex-1", children: [resolvedStartAside, main, endAside] })) : (main), bottomNav ? bottomDrawer : null, bottomNav] }));
}
