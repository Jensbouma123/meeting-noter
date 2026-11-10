import type { ReactNode } from "react";
interface BottomNavItemBase {
    label: string;
    icon: ReactNode;
    current?: boolean;
}
/** Navigates: renders a real `<a href>` so open-in-new-tab and URL preview keep working. */
export interface BottomNavLinkItem extends BottomNavItemBase {
    href: string;
    onClick?: never;
    expanded?: never;
    controls?: never;
}
/**
 * Acts in place: renders a `<button type="button">` for client-side view switching, or for
 * opening a panel from the bar. `expanded`/`controls` are the disclosure pair — set both when
 * the item toggles a `Drawer`/`Modal` so assistive tech can announce and reach it (SC 4.1.2).
 */
export interface BottomNavActionItem extends BottomNavItemBase {
    onClick: () => void;
    href?: never;
    expanded?: boolean;
    controls?: string;
}
export type BottomNavItem = BottomNavLinkItem | BottomNavActionItem;
type UpToFive<T> = [T] | [T, T] | [T, T, T] | [T, T, T, T] | [T, T, T, T, T];
/**
 * `"fixed"` pins the bar to the bottom of its containing block — the viewport, or the
 * nearest ancestor that establishes one. `"static"` leaves it in normal flow as the last
 * child of a column shell, which is what a width-simulated frame (a phone mock, a preview
 * pane) needs: no containing-block trick, no stacking context.
 */
export type BottomNavPosition = "fixed" | "static";
/**
 * The breakpoint at and above which the bar hides itself. `"never"` keeps it visible at
 * every width — for a bar inside a container whose width is set by its own layout rather
 * than by the viewport, since a media query reads the viewport and no ancestor can scope it.
 */
export type BottomNavHideAt = "sm" | "md" | "lg" | "xl" | "never";
export interface BottomNavProps {
    items: UpToFive<BottomNavItem>;
    position?: BottomNavPosition;
    hideAt?: BottomNavHideAt;
    className?: string;
    "aria-label"?: string;
}
export {};
