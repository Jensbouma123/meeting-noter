import type { HTMLAttributes, ReactNode } from "react";
import type { SizeTier } from "@/lib/sizing-tokens/index";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div";
export type HeadingSize = SizeTier | "display";
export type HeadingWeight = "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold" | "black";
export type HeadingAlign = "left" | "center" | "right" | "justify";
/**
 * The same semantic tone scale `Text` and every other tone-carrying component
 * uses, under the same prop name. `color` was the old spelling here and clashed
 * with the native HTML `color` attribute `HTMLAttributes` already declares.
 */
export type HeadingVariant = "default" | "muted" | "subtle" | "primary" | "success" | "warning" | "danger" | "inherit";

/** @deprecated Use {@link HeadingVariant}. */
export type HeadingColor = HeadingVariant;
export type HeadingFont = "sans" | "serif" | "mono" | "display" | "custom";
export type HeadingTruncate = boolean | 1 | 2 | 3;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag;
  level?: HeadingLevel;
  size?: HeadingSize;
  weight?: HeadingWeight;
  align?: HeadingAlign;
  variant?: HeadingVariant;
  /**
   * @deprecated Use `variant`. Kept working so no caller breaks; it loses to
   * `variant` when both are set and will be removed in a future major.
   */
  color?: HeadingColor;
  font?: HeadingFont;
  truncate?: HeadingTruncate;
  children?: ReactNode;
}
