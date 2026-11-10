import { type HTMLAttributes, type ReactNode } from "react";
import { type TextSizeTier } from "../../lib/sizing-tokens.js";
export type TextTag = "p" | "span" | "div" | "label" | "strong" | "em" | "small" | "blockquote" | "code";
export type TextSize = TextSizeTier | "caption";
export type TextVariant = "default" | "muted" | "subtle" | "primary" | "success" | "warning" | "danger" | "inherit";
export type TextWeight = "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold" | "black";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextFont = "sans" | "serif" | "mono" | "display" | "custom";
export type TextTruncate = boolean | 1 | 2 | 3;
export interface TextProps extends HTMLAttributes<HTMLElement> {
    as?: TextTag;
    size?: TextSize;
    variant?: TextVariant;
    weight?: TextWeight;
    align?: TextAlign;
    font?: TextFont;
    truncate?: TextTruncate;
    children?: ReactNode;
}
export declare const Text: import("react").ForwardRefExoticComponent<TextProps & import("react").RefAttributes<HTMLElement>>;
