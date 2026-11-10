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
    /** Single-select state: selected fill + `aria-current`. Ignored when `checked` is set. */
    selected?: boolean;
    /** Multi-select state: switches the row to `role="checkbox"` with `aria-checked`. Wins over `selected`. */
    checked?: boolean;
    /** Outline indent levels; each level is one `xl` spacing step. */
    depth?: number;
}
export declare const ListItem: import("react").ForwardRefExoticComponent<ListItemProps & import("react").RefAttributes<HTMLButtonElement>>;
