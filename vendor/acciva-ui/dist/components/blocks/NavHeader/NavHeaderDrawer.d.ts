import type { ReactNode } from "react";
import { type NavSearchItem, type PrimaryNavLink } from "./NavHeaderData.js";
interface NavHeaderDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    id: string;
    searchItems: NavSearchItem[];
    navLinks: PrimaryNavLink[];
    logo?: ReactNode;
    homeHref: string;
    brandLabel: string;
    themeToggle: boolean;
}
export declare function NavHeaderDrawer({ open, onOpenChange, id, searchItems, navLinks, logo, homeHref, brandLabel, themeToggle, }: NavHeaderDrawerProps): import("react").JSX.Element;
export {};
