import { forwardRef, type ElementType, type ReactElement } from "react";
import { StackBase as Stack } from "@/components/ui/Stack/StackBase";
import type { PolymorphicRef, StackProps } from "@/components/ui/Stack/StackTypes";

export type VStackProps<C extends ElementType = "div"> = Omit<
  StackProps<C>,
  "direction"
>;

type VStackComponent = <C extends ElementType = "div">(
  props: VStackProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;

export const VStack: VStackComponent = forwardRef(
  function VStack<C extends ElementType = "div">(
    { align = "stretch", ...props }: VStackProps<C>,
    ref: PolymorphicRef<C>,
  ) {
    return (
      <Stack
        {...(props as StackProps<C>)}
        align={align}
        direction="vertical"
        ref={ref}
      />
    );
  } as unknown as (
    props: VStackProps<"div">,
    ref: PolymorphicRef<"div">,
  ) => ReactElement | null,
) as VStackComponent;
