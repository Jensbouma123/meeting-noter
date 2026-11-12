import type React from "react";
import { cn } from "@/lib/utils";
import { resolveHeight } from "@/components/ui/Logo/geometry";
import type { LogoRest, LogoSize } from "@/components/ui/Logo/types";

export function renderCustomMark(
  size: LogoSize,
  mark: React.ReactNode,
  src: string | undefined,
  alt: string | undefined,
  ariaLabel: string,
  isAriaHidden: boolean,
  className: string | undefined,
  rest: LogoRest,
) {
  const height = resolveHeight(size);

  if (src && !mark) {
    const isDecorative = alt === "" || isAriaHidden;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={isDecorative ? "" : (alt ?? ariaLabel)}
        aria-hidden={isDecorative ? "true" : undefined}
        width={height}
        height={height}
        className={cn("shrink-0 object-contain", className)}
        {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  return (
    <span
      role={isAriaHidden ? undefined : "img"}
      aria-label={isAriaHidden ? undefined : ariaLabel}
      aria-hidden={isAriaHidden ? "true" : undefined}
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      {...rest}
    >
      {mark}
    </span>
  );
}
