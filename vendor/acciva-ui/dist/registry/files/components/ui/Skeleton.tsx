import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SkeletonVariant = "text" | "circular" | "rectangular" | "rounded";
export type SkeletonAnimation = "pulse" | "shimmer" | "none";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  animation?: SkeletonAnimation;
  width?: number | string;
  height?: number | string;
  lines?: number;
}

// A placeholder block has to darken its parent in light mode and lighten it in dark, which is
// what a tinted foreground does for free — the mode branch stays in the semantic layer instead
// of being hand-written as a `dark:` pair here.
const SKELETON_FILL = "bg-muted-foreground/20";

const variantClasses: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  circular: "rounded-full aspect-square shrink-0",
  rectangular: "rounded-none w-full",
  rounded: "rounded-xl w-full",
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    variant = "text",
    animation = "pulse",
    width,
    height,
    lines,
    className,
    style,
    ...props
  },
  ref,
) {
  const animationClass =
    animation === "pulse"
      ? "animate-pulse"
      : animation === "shimmer"
        ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-neutral-50/25 before:to-transparent"
        : "";

  const customStyle = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ...style,
  };

  if (lines && lines > 1) {
    return (
      <div ref={ref} className={cn("flex flex-col gap-2 w-full", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={i === lines - 1 && !width ? { ...customStyle, width: "70%" } : customStyle}
            className={cn(
              SKELETON_FILL,
              variantClasses[variant],
              animationClass,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={customStyle}
      className={cn(
        SKELETON_FILL,
        variantClasses[variant],
        animationClass,
        className,
      )}
      {...props}
    />
  );
});
