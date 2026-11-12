import { forwardRef, type ElementType, type ReactElement } from "react";
import { StackBase } from "@/components/ui/Stack/StackBase";
import { directionClass } from "@/components/ui/Stack/StackTokens";
import type { PolymorphicRef, StackComponent, StackProps } from "@/components/ui/Stack/StackTypes";

// ---------------------------------------------------------------------------
// Stack (full primitive: single or per-breakpoint direction)
// ---------------------------------------------------------------------------

export const Stack: StackComponent = forwardRef(
  function Stack<C extends ElementType = "div">(
    { direction = "vertical", ...props }: StackProps<C>,
    ref: PolymorphicRef<C>,
  ) {
    return (
      <StackBase
        {...(props as StackProps<"div">)}
        directionClass={directionClass(direction)}
        ref={ref as PolymorphicRef<"div">}
      />
    );
  } as unknown as (
    props: StackProps<"div">,
    ref: PolymorphicRef<"div">,
  ) => ReactElement | null,
) as StackComponent;
