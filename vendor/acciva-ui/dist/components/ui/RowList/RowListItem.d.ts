import { type HTMLAttributes, type ReactNode } from "react";
export interface RowListItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "title"> {
    /** Primary line. */
    title: ReactNode;
    /** Secondary muted line: timestamp, subtitle, detail. */
    meta?: ReactNode;
    /** Leading slot: icon, avatar, status dot. Must be inert. */
    leading?: ReactNode;
    /** Trailing slot: badge, count, value. Must be inert. */
    trailing?: ReactNode;
}
export declare const RowListItem: import("react").ForwardRefExoticComponent<RowListItemProps & import("react").RefAttributes<HTMLLIElement>>;
