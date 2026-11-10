import type { ReactNode } from "react";
import type { BottomNavHideAt } from "../ui/BottomNav/BottomNavTypes.js";
import { type NavSearchItem } from "./NavHeader.js";
export interface AppShellProps {
    children: ReactNode;
    /** Replaces the default `<NavHeader />`. Omit to keep today's hardcoded header. */
    header?: ReactNode;
    /** Forwarded to the default `<NavHeader />` as its `searchItems`; ignored when `header` is given. */
    searchItems?: NavSearchItem[];
    /** Renders beside `<main>`, e.g. an icon rail or `Sidebar`. Alias for `startAside`; omitted by default. */
    sidebar?: ReactNode;
    /** Renders before `<main>`, outside its padding. Takes precedence over `sidebar` when both are given. */
    startAside?: ReactNode;
    /** Renders after `<main>`, outside its padding, e.g. a contextual/inspector rail. Omitted by default. */
    endAside?: ReactNode;
    /** Set `false` to omit the leading "Skip to main content" link, e.g. when a parent shell renders its own. Defaults to `true`. */
    skipLink?: boolean;
    /** A `BottomNav`, rendered last. `<main>` gets bottom padding for the bar (SC 2.4.11). */
    bottomNav?: ReactNode;
    /** A `BottomNavDrawer`, rendered after `<main>` and before `bottomNav`. Ignored without `bottomNav`. */
    bottomDrawer?: ReactNode;
    /** Must match the `BottomNav`'s `hideAt` (default `"md"`): from that breakpoint the bottom padding drops back to the plain `<main>` padding. */
    bottomNavHideAt?: BottomNavHideAt;
}
export declare const NAV_HIDE_PADDING: Record<BottomNavHideAt, string>;
export declare const MAIN_ID = "main";
/** First tab stop: jumps past the header/nav to `<main id="main">` (SC 2.4.1). */
export declare function SkipLink(): import("react").JSX.Element;
export declare function AppShell({ children, header, searchItems, sidebar, startAside, endAside, skipLink, bottomNav, bottomDrawer, bottomNavHideAt, }: AppShellProps): import("react").JSX.Element;
