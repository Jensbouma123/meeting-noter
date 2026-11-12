import {
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { FRAME_MAX_WIDTH, type FrameMaxWidth } from "@/lib/layout-tokens";
import { cn } from "@/lib/utils";
import { INSET_PADDING, type Spacing, type StackAlign } from "@/components/ui/Stack/index";

export type { FrameMaxWidth };

const ALIGN_CLASS: Record<StackAlign, string> = {
  leading: "items-start",
  center: "items-center",
  trailing: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

export interface FrameProps extends HTMLAttributes<HTMLElement> {
  /** Polymorphic element — defaults to `"div"`. */
  as?: ElementType;
  /** Readable-width ceiling for the content, from `FRAME_MAX_WIDTH` in [[styling]]. */
  maxWidth?: FrameMaxWidth;
  /** Padding inside the frame. */
  padding?: Spacing;
  /** Fills the available space (`w-full h-full`). */
  fill?: boolean;
  /** Centres the frame in its parent (`mx-auto`). */
  center?: boolean;
  /** Cross-axis alignment of the content; turns the frame into a flex column. */
  align?: StackAlign;
  /** Framed content. */
  children?: ReactNode;
}

export const Frame = forwardRef<HTMLElement, FrameProps>(function Frame(
  {
    as: Tag = "div",
    maxWidth = "none",
    padding = "none",
    fill = false,
    center = false,
    align,
    className,
    children,
    ...props
  },
  ref,
) {
  const Component = Tag as ElementType;

  return (
    <Component
      ref={ref}
      className={cn(
        FRAME_MAX_WIDTH[maxWidth],
        INSET_PADDING[padding],
        fill && "w-full h-full",
        center && "mx-auto",
        align && ["flex flex-col", ALIGN_CLASS[align]],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
