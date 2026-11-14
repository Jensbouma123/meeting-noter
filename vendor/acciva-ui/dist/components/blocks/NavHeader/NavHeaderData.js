import { BookOpen, Layers, LayoutGrid, Palette, Type } from "lucide-react";
export const PRIMARY_NAV_LINKS = [
    { label: "Docs", href: "/", icon: BookOpen },
    { label: "Gallery", href: "/gallery", icon: LayoutGrid },
    { label: "Examples", href: "/examples", icon: Layers },
    { label: "Color Studio", href: "/color-studio", icon: Palette },
    { label: "Typography Studio", href: "/typography-studio", icon: Type },
];
export const NO_SEARCH_ITEMS = [];
/** Docs filter cap in the drawer. */
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
