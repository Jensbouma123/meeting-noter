import { cn } from "@/lib/utils";
import { getDimensions, resolveHeight } from "@/components/ui/Logo/geometry";
import { WordmarkText } from "@/components/ui/Logo/LogoParts";
import type { LogoRest, LogoSize, LogoVariant } from "@/components/ui/Logo/types";

export function renderCustomLockup(
  variant: LogoVariant,
  size: LogoSize,
  mark: React.ReactNode,
  src: string | undefined,
  ariaLabel: string,
  isAriaHidden: boolean,
  className: string | undefined,
  rest: LogoRest,
) {
  const height = resolveHeight(size);
  const wordmarkDim = getDimensions("wordmark", size);
  const markElement = mark ? (
    <span aria-hidden="true" className="inline-flex items-center justify-center shrink-0">
      {mark}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={height}
      height={height}
      className="h-full w-auto object-contain shrink-0"
    />
  );

  return (
    <span
      role={isAriaHidden ? undefined : "img"}
      aria-label={isAriaHidden ? undefined : ariaLabel}
      aria-hidden={isAriaHidden ? "true" : undefined}
      className={cn("inline-flex items-center gap-2 shrink-0", className)}
      {...rest}
    >
      {markElement}
      <svg
        width={wordmarkDim.width}
        height={wordmarkDim.height}
        viewBox={wordmarkDim.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={cn("shrink-0", variant === "responsive" && "hidden sm:inline-block")}
      >
        <WordmarkText x={0} />
      </svg>
    </span>
  );
}
