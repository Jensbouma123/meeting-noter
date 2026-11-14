import type { ComponentType } from "react";
export type PrimaryNavIcon = ComponentType<{
    className?: string;
}>;
export interface PrimaryNavLink {
    label: string;
    href: string;
    /** Drawer glyph. Optional — the desktop row is text-only, so a text-only link omits it. Widened beyond `LucideIcon` so any icon set works. */
    icon?: PrimaryNavIcon;
    /** Overrides the route-prefix match for this link. When provided it wins, so a host can supply its own active-section contract. */
    isActive?: boolean;
}
export declare const PRIMARY_NAV_LINKS: PrimaryNavLink[];
/** One searchable entry: the header links it to `/components/<slug>`. */
export interface NavSearchItem {
    slug: string;
    title: string;
    /** Heading the drawer tree groups this entry under; the drawer filter also matches it. */
    group: string;
}
export declare const NO_SEARCH_ITEMS: NavSearchItem[];
/** Docs filter cap in the drawer. */
export declare const MAX_SEARCH_RESULTS = 8;
/** Panel width. `maxSize` alone collapses all three detents onto it — a fixed-width panel. */
export declare const DRAWER_WIDTH_PX = 320;
export declare function isActive(pathname: string | null, href: string): boolean;
export declare function resolveNavLinkActive(link: PrimaryNavLink, pathname: string | null): boolean;
export declare function docHref(slug: string): string;
