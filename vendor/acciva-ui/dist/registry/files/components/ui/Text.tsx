import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { TEXT_SIZE, type TextSizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

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

const textSizeClasses: Record<TextSize, string> = {
  caption: "text-xs leading-normal",
  "3xs": `${TEXT_SIZE["3xs"]} leading-tight`,
  xxs: `${TEXT_SIZE.xxs} leading-tight`,
  xs: "text-xs leading-normal",
  sm: "text-sm leading-normal",
  md: "text-base leading-relaxed",
  lg: "text-lg leading-relaxed",
  xl: "text-xl leading-relaxed",
  "2xl": "text-2xl leading-snug",
  "3xl": "text-3xl leading-snug",
};

const textVariantClasses: Record<TextVariant, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  subtle: "text-subtle-foreground",
  primary: "text-primary-600 dark:text-primary-400",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  inherit: "text-inherit",
};

const textWeightClasses: Record<TextWeight, string> = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
  black: "font-black",
};

const textAlignClasses: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

const textFontClasses: Record<TextFont, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
  display: "font-display tracking-tight",
  custom: "font-custom",
};

function getTruncateClass(truncate?: TextTruncate): string {
  if (!truncate) return "";
  if (truncate === true || truncate === 1) return "truncate";
  if (truncate === 2) return "line-clamp-2";
  if (truncate === 3) return "line-clamp-3";
  return "";
}

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = "p",
    size = "md",
    variant = "default",
    weight = "normal",
    align = "left",
    font = "sans",
    truncate = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const Component = as as ElementType;

  return (
    <Component
      ref={ref}
      className={cn(
        textSizeClasses[size],
        textVariantClasses[variant],
        textWeightClasses[weight],
        textAlignClasses[align],
        textFontClasses[font],
        getTruncateClass(truncate),
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
