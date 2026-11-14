import { BookOpen, Layers, LayoutGrid, Palette, Type } from "lucide-react";
import type { ComponentType } from "react";

export type PrimaryNavIcon = ComponentType<{ className?: string }>;

export interface PrimaryNavLink {
  label: string;
  href: string;
  /** Drawer glyph. Optional — the desktop row is text-only, so a text-only link omits it. Widened beyond `LucideIcon` so any icon set works. */
  icon?: PrimaryNavIcon;
  /** Overrides the route-prefix match for this link. When provided it wins, so a host can supply its own active-section contract. */
  isActive?: boolean;
}

export const PRIMARY_NAV_LINKS: PrimaryNavLink[] = [
  { label: "Docs", href: "/", icon: BookOpen },
  { label: "Gallery", href: "/gallery", icon: LayoutGrid },
  { label: "Examples", href: "/examples", icon: Layers },
  { label: "Color Studio", href: "/color-studio", icon: Palette },
  { label: "Typography Studio", href: "/typography-studio", icon: Type },
];

/** One searchable entry: the header links it to `/components/<slug>`. */
export interface NavSearchItem {
  slug: string;
  title: string;
  /** Heading the drawer tree groups this entry under; the drawer filter also matches it. */
  group: string;
}

export const NO_SEARCH_ITEMS: NavSearchItem[] = [];

/** Docs filter cap in the drawer. */
export const MAX_SEARCH_RESULTS = 8;

/** Panel width. `maxSize` alone collapses all three detents onto it — a fixed-width panel. */
export const DRAWER_WIDTH_PX = 320;

const DOCS_ROOTS = ["/components", "/getting-started", "/icons", "/sizing"];

function matchesPrefix(pathname: string | null, href: string): boolean {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

export function isActive(pathname: string | null, href: string): boolean {
  if (href === "/") return pathname === "/" || DOCS_ROOTS.some((root) => matchesPrefix(pathname, root));
  return matchesPrefix(pathname, href);
}

export function resolveNavLinkActive(link: PrimaryNavLink, pathname: string | null): boolean {
  return link.isActive ?? isActive(pathname, link.href);
}

export function docHref(slug: string) {
  return `/components/${slug}`;
}
