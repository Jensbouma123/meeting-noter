import { forwardRef, type ElementType } from "react";
import { cn } from "@/lib/utils";
import {
  getTruncateClass,
  headingAlignClasses,
  headingFontClasses,
  headingSizeClasses,
  headingVariantClasses,
  headingWeightClasses,
} from "@/components/ui/Heading/classes";
import type { HeadingLevel, HeadingProps, HeadingSize, HeadingVariant } from "@/components/ui/Heading/types";

const defaultLevelSizes: Record<HeadingLevel, HeadingSize> = {
  1: "2xl",
  2: "xl",
  3: "lg",
  4: "md",
  5: "sm",
  6: "xs",
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  {
    as,
    level = 1,
    size,
    weight = "bold",
    align = "left",
    variant,
    color,
    font = "sans",
    truncate = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const Component = (as ?? `h${level}`) as ElementType;
  const resolvedSize = size ?? defaultLevelSizes[level];
  const resolvedVariant: HeadingVariant = variant ?? color ?? "default";

  return (
    <Component
      ref={ref}
      className={cn(
        "text-balance wrap-break-word",
        headingSizeClasses[resolvedSize],
        headingWeightClasses[weight],
        headingAlignClasses[align],
        headingVariantClasses[resolvedVariant],
        headingFontClasses[font],
        getTruncateClass(truncate),
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
