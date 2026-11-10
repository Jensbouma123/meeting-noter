import { BookOpen, Layers, LayoutGrid, Palette, Type } from "lucide-react";
import { cn } from "../../../lib/utils.js";
export const PRIMARY_NAV_LINKS = [
    { label: "Docs", href: "/", icon: BookOpen },
    { label: "Gallery", href: "/gallery", icon: LayoutGrid },
    { label: "Examples", href: "/examples", icon: Layers },
    { label: "Color Studio", href: "/color-studio", icon: Palette },
    { label: "Typography Studio", href: "/typography-studio", icon: Type },
];
export const NO_SEARCH_ITEMS = [];
export const MAX_SEARCH_RESULTS = 8;
/** Panel width. `maxSize` alone collapses all three detents onto it — a fixed-width panel. */
export const DRAWER_WIDTH_PX = 320;
const DOCS_ROOTS = ["/components", "/getting-started", "/icons", "/sizing"];
function matchesPrefix(pathname, href) {
    return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}
export function isActive(pathname, href) {
    if (href === "/")
        return pathname === "/" || DOCS_ROOTS.some((root) => matchesPrefix(pathname, root));
    return matchesPrefix(pathname, href);
}
export function resolveNavLinkActive(link, pathname) {
    return link.isActive ?? isActive(pathname, link.href);
}
export function docHref(slug) {
    return `/components/${slug}`;
}
/** Resting + hover treatment shared by every idle nav link and option. */
export const NAV_IDLE = "text-foreground hover:bg-elevation-3 active:bg-elevation-4";
/** Drawer row: the touch target, shape and active/idle fill shared by the nav and docs lists. */
export const navRowClass = (active, extra) => cn("touch-target-44 focus-ring flex min-h-11 items-center rounded-lg px-3 py-2 transition-colors motion-feedback", active ? "bg-primary-500/15 font-semibold text-primary-800 dark:text-primary-300" : NAV_IDLE, extra);
