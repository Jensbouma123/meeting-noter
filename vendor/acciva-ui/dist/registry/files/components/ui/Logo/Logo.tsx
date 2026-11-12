import { renderBuiltIn } from "@/components/ui/Logo/builtIn";
import { renderCustomLockup } from "@/components/ui/Logo/customLockup";
import { renderCustomMark } from "@/components/ui/Logo/customMark";
import type { LogoProps } from "@/components/ui/Logo/types";

export function Logo({
  variant = "full",
  size = "md",
  mark,
  src,
  alt,
  className,
  "aria-label": customAriaLabel,
  ...rest
}: LogoProps) {
  const ariaLabel = customAriaLabel ?? (alt || "ACCIVA UI");
  const isAriaHidden = rest["aria-hidden"] === true || rest["aria-hidden"] === "true";

  // A custom mark never changes the wordmark-only lockup, so it shares the built-in render.
  if ((!mark && !src) || variant === "wordmark") {
    return renderBuiltIn(variant, size, ariaLabel, className, rest);
  }

  if (variant === "mark") {
    return renderCustomMark(size, mark, src, alt, ariaLabel, isAriaHidden, className, rest);
  }

  return renderCustomLockup(variant, size, mark, src, ariaLabel, isAriaHidden, className, rest);
}
