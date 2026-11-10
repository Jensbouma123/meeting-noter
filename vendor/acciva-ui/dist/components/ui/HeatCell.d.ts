import type { HTMLAttributes } from "react";
export interface HeatCellProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "role" | "aria-label" | "aria-hidden"> {
    /** Ratio `0..1`, clamped. Quantised to five opacity steps. */
    intensity?: number;
    /** No data: neutral empty fill, `intensity` ignored. */
    isEmpty?: boolean;
    /** Accessible name naming the value. Required for data cells (SC 1.4.1). Omit only when decorative. */
    label?: string;
}
/**
 * One heatmap cell. With `label` it is an image with a text alternative; without, it is decorative
 * and the grid must be explained in text (SC 1.4.1, 1.1.1).
 */
export declare function HeatCell({ intensity, isEmpty, label, className, ...props }: HeatCellProps): import("react").JSX.Element;
