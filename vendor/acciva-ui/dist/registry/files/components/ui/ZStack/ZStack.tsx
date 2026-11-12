import { forwardRef, type ElementType, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import {
  INSET_PADDING,
  type PolymorphicProps,
  type PolymorphicRef,
  type Spacing,
} from "@/components/ui/Stack/index";

/** Where every layer sits inside the stack. Logical, so RTL needs no extra work. */
export type ZAlign =
  | "top-leading"
  | "top"
  | "top-trailing"
  | "leading"
  | "center"
  | "trailing"
  | "bottom-leading"
  | "bottom"
  | "bottom-trailing";

/**
 * Block-axis alignment comes from `items-*` and inline-axis alignment from
 * `justify-items-*`, both set on the grid container so no wrapper element is
 * needed per layer.
 */
const ALIGN_CLASS: Record<ZAlign, string> = {
  "top-leading": "items-start justify-items-start",
  top: "items-start justify-items-center",
  "top-trailing": "items-start justify-items-end",
  leading: "items-center justify-items-start",
  center: "items-center justify-items-center",
  trailing: "items-center justify-items-end",
  "bottom-leading": "items-end justify-items-start",
  bottom: "items-end justify-items-center",
  "bottom-trailing": "items-end justify-items-end",
};

/** Every direct child is pinned to the single grid cell, so children overlap. */
const LAYER_CLASS = "*:col-start-1 *:row-start-1";

export interface ZStackOwnProps {
  /** Where every layer sits inside the stack. */
  align?: ZAlign;
  /** Inset padding around the layers. */
  inset?: Spacing;
}

export type ZStackProps<C extends ElementType = "div"> = PolymorphicProps<
  C,
  ZStackOwnProps
>;

type ZStackComponent = <C extends ElementType = "div">(
  props: ZStackProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;

export const ZStack: ZStackComponent = forwardRef(
  function ZStack<C extends ElementType = "div">(
    {
      as,
      align = "center",
      inset = "none",
      className,
      children,
      ...props
    }: ZStackProps<C>,
    ref: PolymorphicRef<C>,
  ) {
    const Component = (as ?? "div") as ElementType;

    return (
      <Component
        ref={ref}
        className={cn(
          "grid",
          LAYER_CLASS,
          ALIGN_CLASS[align],
          INSET_PADDING[inset],
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  } as unknown as (
    props: ZStackProps<"div">,
    ref: PolymorphicRef<"div">,
  ) => ReactElement | null,
) as ZStackComponent;
