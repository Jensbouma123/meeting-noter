import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import type { SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import {
  INSET_PADDING,
  SPACING_GAP,
  type Spacing,
  type StackAlign,
} from "@/components/ui/Stack/index";

/**
 * Widest column count `columns` accepts. Seven is the floor a calendar needs — a
 * week is the most common fixed grid in the library — and eight covers a dense
 * icon or swatch picker at `sm:` and up.
 */
const MAX_COLUMNS = 8;

// Every class below is written out in full: the Tailwind scanner reads source text,
// so a built string like `grid-cols-${n}` would compile to no CSS at all.
const SIZE_TO_COL: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
};

const SIZE_TO_COL_SM: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
  7: "sm:grid-cols-7",
  8: "sm:grid-cols-8",
};

const SIZE_TO_COL_MD: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
  7: "md:grid-cols-7",
  8: "md:grid-cols-8",
};

const SIZE_TO_COL_LG: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
  8: "lg:grid-cols-8",
};

const SIZE_TO_COL_XL: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",
  8: "xl:grid-cols-8",
};

const clampColumns = (count: number) => Math.min(Math.max(count, 1), MAX_COLUMNS);

const SIZE_TO_MIN_WIDTH: Record<SizeTier, string> = {
  xxs: "min-w-12",
  xs: "min-w-16",
  sm: "min-w-20",
  md: "min-w-24",
  lg: "min-w-32",
  xl: "min-w-40",
  "2xl": "min-w-48",
  "3xl": "min-w-56",
};

const ALIGN_MAP: Record<StackAlign, string> = {
  leading: "items-start",
  center: "items-center",
  trailing: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: Spacing;
  align?: StackAlign;
  minItemWidth?: SizeTier;
  inset?: Spacing;
  children?: ReactNode;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  {
    columns = 1,
    spacing = "md",
    align = "stretch",
    minItemWidth,
    inset = "none",
    className,
    children,
    ...props
  },
  ref,
) {
  const isResponsive = typeof columns === "object";
  const baseCols = isResponsive ? (columns.base ?? 1) : columns;

  const columnClasses = [
    SIZE_TO_COL[clampColumns(baseCols)],
    isResponsive && columns.sm ? SIZE_TO_COL_SM[clampColumns(columns.sm)] : undefined,
    isResponsive && columns.md ? SIZE_TO_COL_MD[clampColumns(columns.md)] : undefined,
    isResponsive && columns.lg ? SIZE_TO_COL_LG[clampColumns(columns.lg)] : undefined,
    isResponsive && columns.xl ? SIZE_TO_COL_XL[clampColumns(columns.xl)] : undefined,
  ].filter((c): c is string => c !== undefined);

  const autoFitClass = minItemWidth ? SIZE_TO_MIN_WIDTH[minItemWidth] : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "grid",
        SPACING_GAP[spacing],
        ALIGN_MAP[align],
        INSET_PADDING[inset],
        ...columnClasses,
        autoFitClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
