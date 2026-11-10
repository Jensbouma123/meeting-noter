import { type HTMLAttributes, type ReactNode } from "react";
export interface FooterBarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    /** Start-edge actions, typically icon buttons. */
    leading?: ReactNode;
    /** End-edge actions, typically icon buttons. */
    trailing?: ReactNode;
}
/**
 * A bottom action bar: a `border` top rule over a `surface` row. `px-safe` and `pb-safe`
 * pad the bar over the safe area, so the background bleeds under the home indicator while
 * the row stays clear of it (see [[pwa]]). `ml-auto` pins the trailing group to the end edge.
 */
export declare const FooterBar: import("react").ForwardRefExoticComponent<FooterBarProps & import("react").RefAttributes<HTMLElement>>;
