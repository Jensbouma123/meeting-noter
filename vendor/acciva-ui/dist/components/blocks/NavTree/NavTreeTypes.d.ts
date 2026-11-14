import type { ReactNode } from "react";
export interface NavTreeItem {
    href: string;
    label: string;
    /** Optional leading icon (decorative, hidden from assistive tech). Shown on top-level rows. */
    icon?: ReactNode;
    children?: NavTreeItem[];
}
/** A headed, non-collapsible list of links: a labelled section of a flat nav. */
export interface NavTreeSection {
    heading: string;
    items: NavTreeItem[];
}
export interface NavTreeGroup {
    label: string;
    items: NavTreeItem[];
    count?: number;
}
export interface NavTreeBaseProps {
    /** Grouped, collapsible shape. Omit when passing a flat `items` list instead. */
    groups?: NavTreeGroup[];
    /** A flat list of links, rendered with no grouping or collapse behaviour. */
    items?: NavTreeItem[];
    /** Headed flat lists (no collapse), e.g. "Main" / "Settings" link sections. Wins over `groups`, loses to `items`. */
    sections?: NavTreeSection[];
    activeHref?: string;
    forceExpandAll?: boolean;
    "aria-describedby"?: string;
    /** First-keyboard-focus caption; `false` disables it. */
    arrowHint?: string | false;
}
/**
 * A landmark `<nav>` is useless to a screen-reader user without a name, so
 * exactly one of the two spellings is required. `ariaLabel` is the deprecated
 * camelCase spelling, kept working for existing callers; new code passes
 * `aria-label`.
 */
export type NavTreeAccessibleName = {
    "aria-label": string;
    /** @deprecated Use `aria-label`. */
    ariaLabel?: never;
} | {
    /** @deprecated Use `aria-label`. Removed in a future major. */
    ariaLabel: string;
    "aria-label"?: never;
};
export type NavTreeProps = NavTreeBaseProps & NavTreeAccessibleName;
