import type { NavTreeItem, NavTreeSection } from "./NavTreeTypes.js";
/** The icon is decorative: the row's label already names the link (SC 1.1.1). */
export declare const navIcon: (item: NavTreeItem) => import("react").JSX.Element | undefined;
export declare function NavTreeFlatList({ items, activeHref, labelledBy, }: {
    items: NavTreeItem[];
    activeHref?: string;
    labelledBy?: string;
}): import("react").JSX.Element;
export declare function NavTreeSectionBlock({ section, activeHref }: {
    section: NavTreeSection;
    activeHref?: string;
}): import("react").JSX.Element;
