import { type HTMLAttributes } from "react";
export type SwatchSize = "xs" | "sm" | "md" | "lg";
export declare const SWATCH_SIZE_CLASS: Record<SwatchSize, string>;
export interface SwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
    /** Any `parseColor` input. Parsed and re-serialized; the raw string never reaches CSS. */
    color: string;
    /** Absent → decorative (`aria-hidden`). Present → `role="img"` + `aria-label`. */
    label?: string;
    size?: SwatchSize;
}
export interface LegendItemProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
    color: string;
    /** The colour's name; combines with `caption` into the single accessible name. */
    label?: string;
    /** Visible caption text. */
    caption: string;
    size?: SwatchSize;
}
export declare function Swatch({ color, label, size, className, ...rest }: SwatchProps): import("react").JSX.Element;
export declare function LegendItem({ color, label, caption, size, className, ...rest }: LegendItemProps): import("react").JSX.Element;
