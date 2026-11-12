import { forwardRef, type ElementType, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import {
  ALIGN_CLASS,
  DIRECTION_CLASS,
  INSET_PADDING,
  JUSTIFY_CLASS,
  SPACING_GAP,
} from "@/components/ui/Stack/StackTokens";
import type {
  PolymorphicRef,
  StackDirection,
  StackProps,
} from "@/components/ui/Stack/StackTypes";

// ---------------------------------------------------------------------------
// StackBase: single-axis core (no responsive resolver) shared by HStack/VStack
// ---------------------------------------------------------------------------

/** @internal Takes a precomputed `directionClass` so the responsive resolver stays out of HStack/VStack bundles. */
export type StackBaseProps<C extends ElementType = "div"> = StackProps<C> & {
  directionClass?: string;
};

type StackBaseComponent = <C extends ElementType = "div">(
  props: StackBaseProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;

export const StackBase: StackBaseComponent = forwardRef(
  function Stack<C extends ElementType = "div">(
    {
      as,
      direction = "vertical",
      directionClass,
      spacing = "md",
      align,
      justify = "leading",
      wrap = false,
      inset = "none",
      fill = false,
      className,
      children,
      ...props
    }: StackBaseProps<C>,
    ref: PolymorphicRef<C>,
  ) {
    const Component = (as ?? "div") as ElementType;

    return (
      <Component
        ref={ref}
        className={cn(
          "flex",
          directionClass ?? DIRECTION_CLASS[direction as StackDirection],
          align && ALIGN_CLASS[align],
          JUSTIFY_CLASS[justify],
          SPACING_GAP[spacing],
          wrap && "flex-wrap",
          INSET_PADDING[inset],
          fill && "min-w-0 min-h-0 flex-1",
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  } as unknown as (
    props: StackProps<"div">,
    ref: PolymorphicRef<"div">,
  ) => ReactElement | null,
) as StackBaseComponent;
