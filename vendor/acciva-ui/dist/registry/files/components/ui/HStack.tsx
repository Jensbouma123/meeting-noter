import { forwardRef, type ElementType, type ReactElement } from "react";
import { StackBase as Stack } from "@/components/ui/Stack/StackBase";
import type { PolymorphicRef, StackProps } from "@/components/ui/Stack/StackTypes";

export type HStackProps<C extends ElementType = "div"> = Omit<
  StackProps<C>,
  "direction"
>;

type HStackComponent = <C extends ElementType = "div">(
  props: HStackProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;

export const HStack: HStackComponent = forwardRef(
  function HStack<C extends ElementType = "div">(
    { align = "center", ...props }: HStackProps<C>,
    ref: PolymorphicRef<C>,
  ) {
    return (
      <Stack
        {...(props as StackProps<C>)}
        align={align}
        direction="horizontal"
        ref={ref}
      />
    );
  } as unknown as (
    props: HStackProps<"div">,
    ref: PolymorphicRef<"div">,
  ) => ReactElement | null,
) as HStackComponent;
