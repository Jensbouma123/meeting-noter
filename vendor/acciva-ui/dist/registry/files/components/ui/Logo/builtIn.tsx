import type React from "react";
import { cn } from "@/lib/utils";
import { getDimensions } from "@/components/ui/Logo/geometry";
import { PrismMonogram, WordmarkText } from "@/components/ui/Logo/LogoParts";
import type { LogoRest, LogoSize, LogoVariant } from "@/components/ui/Logo/types";

export function renderBuiltIn(
  variant: LogoVariant,
  size: LogoSize,
  ariaLabel: string,
  className: string | undefined,
  rest: LogoRest,
) {
  if (variant === "responsive") {
    const markDim = getDimensions("mark", size);
    const fullDim = getDimensions("full", size);

    return (
      <span
        role="img"
        aria-label={ariaLabel}
        className={cn("inline-flex items-center shrink-0", className)}
        {...rest}
      >
        <svg
          width={markDim.width}
          height={markDim.height}
          viewBox={markDim.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="sm:hidden shrink-0"
        >
          <PrismMonogram />
        </svg>
        <svg
          width={fullDim.width}
          height={fullDim.height}
          viewBox={fullDim.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="hidden sm:inline-block shrink-0"
        >
          <PrismMonogram />
          <WordmarkText x={40} />
        </svg>
      </span>
    );
  }

  const { width, height, viewBox } = getDimensions(variant, size);

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={cn("shrink-0", className)}
      {...(rest as React.SVGAttributes<SVGSVGElement>)}
    >
      {variant === "mark" && <PrismMonogram />}
      {variant === "wordmark" && <WordmarkText x={0} />}
      {variant === "full" && (
        <>
          <PrismMonogram />
          <WordmarkText x={40} />
        </>
      )}
    </svg>
  );
}
