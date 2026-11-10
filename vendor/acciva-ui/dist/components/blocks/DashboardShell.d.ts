import { type ReactNode } from "react";
import { type SidebarItem } from "./Sidebar.js";
export interface DashboardShellProps {
    /** Convenience default: builds the built-in `Sidebar` from a flat item list. Ignored when `sidebar` is given. */
    sidebarItems?: SidebarItem[];
    /** Renders in place of the built-in `Sidebar`, e.g. a custom icon rail. Takes precedence over `sidebarItems`. */
    sidebar?: ReactNode;
    children: ReactNode;
    header?: ReactNode;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    className?: string;
    mainClassName?: string;
    /** Set `false` to omit the injected floating mobile nav trigger. Defaults to `true`. */
    showMobileTrigger?: boolean;
    /** Set `false` to omit the default `p-4 sm:p-6 lg:p-8` main padding. Defaults to `true`. */
    mainPadding?: boolean;
}
export declare function DashboardShell({ sidebarItems, sidebar, children, header, mobileOpen, onMobileOpenChange, className, mainClassName, showMobileTrigger, mainPadding, }: DashboardShellProps): import("react").JSX.Element;
