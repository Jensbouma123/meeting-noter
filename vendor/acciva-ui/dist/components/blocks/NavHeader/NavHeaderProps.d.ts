import type { ReactNode } from "react";
import type { NavSearchItem, PrimaryNavLink } from "./NavHeaderData.js";
export interface NavHeaderProps {
    /** Replaces the brand mark shown in both the topbar link and the drawer header. */
    logo?: ReactNode;
    /** Replaces the hardcoded docs primary nav links (desktop row and mobile drawer list). */
    primaryLinks?: PrimaryNavLink[];
    /** Rendered after the theme toggle, e.g. profile, settings, or other app controls. */
    actions?: ReactNode;
    /** Entries behind the search combobox and the drawer's docs tree. Host-supplied so the library never bundles a docs index; omit (or pass `[]`) to drop the search box and the drawer's docs section. Keep it serialisable when passing it from a Server Component. */
    searchItems?: NavSearchItem[];
    /** Set `false` to omit the docs-search combobox even when `searchItems` is given. Defaults to `true`. */
    search?: boolean;
    /** Set `false` to omit the built-in light/dark theme toggle (topbar and drawer footer). Defaults to `true`. */
    themeToggle?: boolean;
    /** Set `false` to omit the hamburger button and its mobile navigation `Drawer`. Defaults to `true`. */
    menu?: boolean;
    /** Host-owned leading slot at the row start, rendered before the hamburger. Pair with `menu={false}` to drive your own drawer: your trigger carries its own `aria-controls`/`aria-expanded` and this header mounts no `Drawer` of its own. Rendered as-is — supply your own accessible name. */
    startActions?: ReactNode;
    /** Brand link target in the topbar and the drawer header. Defaults to `/`. */
    homeHref?: string;
    /** Accessible name of the brand link in the topbar and the drawer header. Defaults to `"ACCIVA UI"`. */
    brandLabel?: string;
}
