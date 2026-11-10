import { type ButtonHTMLAttributes, type ReactNode } from "react";
export interface ListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
    /** Primary line, rendered as text. */
    title: string;
    /** Secondary muted line; omitted renders a single-line row. */
    subtitle?: string;
    /** Leading slot: icon, avatar, or check glyph. Must be inert. */
    leading?: ReactNode;
    /** Trailing slot: chip, badge, count, or chevron. Must be inert. */
    trailing?: ReactNode;
    /** Single-select state: selected fill + `aria-current` (`"page"` in link mode). Ignored when `checked` is set. */
    selected?: boolean;
    /** Multi-select state: switches the row to `role="checkbox"` with `aria-checked`. Wins over `selected`. Button mode only. */
    checked?: boolean;
    /** Outline indent levels; each level is one `xl` spacing step. */
    depth?: number;
    /**
     * Link mode: merge the row onto its single child element (an `<a>` or router `Link`)
     * instead of rendering a `<button>`. The row content replaces the child's children.
     */
    asChild?: boolean;
}
export declare const ListItem: import("react").ForwardRefExoticComponent<ListItemProps & import("react").RefAttributes<HTMLButtonElement>>;
