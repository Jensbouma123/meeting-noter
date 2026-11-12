import type React from "react";

export type LogoVariant = "mark" | "wordmark" | "full" | "responsive";
export type LogoSize = "sm" | "md" | "lg" | "xl" | number;

export interface LogoProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  variant?: LogoVariant;
  size?: LogoSize;
  mark?: React.ReactNode;
  src?: string;
  alt?: string;
  className?: string;
}

export type LogoRest = Omit<
  LogoProps,
  "variant" | "size" | "mark" | "src" | "alt" | "className" | "aria-label"
>;
