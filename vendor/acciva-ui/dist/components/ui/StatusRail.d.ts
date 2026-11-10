import type { HTMLAttributes } from "react";
export type StatusRailTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StatusRailOrientation = "vertical" | "horizontal";
export interface StatusRailProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    tone?: StatusRailTone;
    orientation?: StatusRailOrientation;
    /** `vertical` only — insets the bar from the parent's top and bottom by one spacing step. */
    inset?: boolean;
}
/**
 * Decorative edge accent. The parent must be `relative`. It is always `aria-hidden`, so the state
 * it signals must also be text or a named icon in the same surface (SC 1.4.1).
 */
export declare function StatusRail({ tone, orientation, inset, className, ...props }: StatusRailProps): import("react").JSX.Element;
