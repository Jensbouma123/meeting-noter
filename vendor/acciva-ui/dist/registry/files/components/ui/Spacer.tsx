import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { Spacing } from "@/components/ui/Stack/index";

/** Minimum length classes per spacing tier — applied on both axes. */
const MIN_LENGTH: Record<Spacing, string> = {
  none: "",
  xxs: "min-w-2 min-h-2",
  xs: "min-w-3 min-h-3",
  sm: "min-w-4 min-h-4",
  md: "min-w-5 min-h-5",
  lg: "min-w-6 min-h-6",
  xl: "min-w-8 min-h-8",
  "2xl": "min-w-10 min-h-10",
  "3xl": "min-w-14 min-h-14",
};

export interface SpacerProps extends HTMLAttributes<HTMLDivElement> {
  /** Minimum length the spacer keeps once the stack runs out of free space. */
  minLength?: Spacing;
}

export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(function Spacer(
  { minLength = "md", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("flex-1 self-stretch", MIN_LENGTH[minLength], className)}
      {...props}
    />
  );
});
