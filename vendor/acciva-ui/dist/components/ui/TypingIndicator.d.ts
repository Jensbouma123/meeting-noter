import { type HTMLAttributes } from "react";
export type TypingIndicatorSize = "sm" | "md" | "lg";
export interface TypingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    size?: TypingIndicatorSize;
}
export declare const TypingIndicator: import("react").ForwardRefExoticComponent<TypingIndicatorProps & import("react").RefAttributes<HTMLDivElement>>;
