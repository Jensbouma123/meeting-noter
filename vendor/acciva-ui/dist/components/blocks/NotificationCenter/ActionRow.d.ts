import type { ReactNode } from "react";
export interface ActionRowProps {
    /** Leading slot: avatar, status dot. Inert. */
    leading?: ReactNode;
    /** Primary line. May hold a control when the block offers select. */
    title: ReactNode;
    /** Secondary muted line. Inert. */
    meta?: ReactNode;
    /** Inert trailing value: timestamp, count. */
    trailing?: ReactNode;
    /** Interactive controls (Dismiss, Remove), beside the row, outside the inert slots (SC 4.1.2). */
    actions?: ReactNode;
}
/**
 * A `<li>` row for blocks whose rows carry buttons. Mirrors `RowList.Item` layout, but
 * the action controls sit in their own trailing group instead of inside an inert slot.
 */
export declare function ActionRow({ leading, title, meta, trailing, actions }: ActionRowProps): import("react").JSX.Element;
