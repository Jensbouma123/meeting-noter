import { type HTMLAttributes } from "react";
export type ProgressVariant = "linear" | "circular";
export type ProgressTone = "brand" | "info" | "success" | "warning" | "danger";
/** Categorical chart series, `--chart-1` … `--chart-8`. */
export type ProgressSeries = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "children" | "aria-label" | "aria-labelledby"> {
    /** Accessible name. Required: a progressbar without a name fails SC 4.1.2. */
    label: string;
    /** Omit for indeterminate. Clamped to `0..max`. */
    value?: number;
    max?: number;
    variant?: ProgressVariant;
    tone?: ProgressTone;
    /** Categorical series colour for share/meter bars; overrides `tone` for the indicator only. */
    series?: ProgressSeries;
    /** Spoken instead of the percentage, e.g. "3 of 8 files". */
    valueText?: string;
}
export declare const Progress: import("react").ForwardRefExoticComponent<ProgressProps & import("react").RefAttributes<HTMLDivElement>>;
