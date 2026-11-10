import type { ReactNode } from "react";
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
}
export declare function AppShell({ children, header, searchItems, sidebar, startAside, endAside }: AppShellProps): import("react").JSX.Element;
