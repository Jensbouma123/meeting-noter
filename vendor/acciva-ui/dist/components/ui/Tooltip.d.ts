import { type ReactElement, type ReactNode } from "react";
export interface TooltipProps {
    content: ReactNode;
    children: ReactElement;
    side?: "top" | "bottom" | "left" | "right";
    /** ms to wait before showing on hover/focus. `0` (the default) shows instantly. */
    delay?: number;
    maxWidth?: number | string;
}
export declare function Tooltip({ content, children, side, delay, maxWidth }: TooltipProps): import("react").JSX.Element;
