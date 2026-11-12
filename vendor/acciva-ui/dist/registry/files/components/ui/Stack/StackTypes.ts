import type {
  ComponentPropsWithRef,
  ElementType,
  ReactElement,
} from "react";
import type { SizeTier } from "@/lib/sizing-tokens/index";

// ---------------------------------------------------------------------------
// Shared types (exported for consumers and downstream layout primitives)
// ---------------------------------------------------------------------------

/** Cross-axis alignment inside a flex stack. Logical, so RTL needs no extra work. */
export type StackAlign =
  | "leading"
  | "center"
  | "trailing"
  | "stretch"
  | "baseline";

/** Main-axis distribution. Logical, so RTL needs no extra work. */
export type StackJustify =
  | "leading"
  | "center"
  | "trailing"
  | "between"
  | "around"
  | "evenly";

/** Spacing scale — maps to Tailwind gap/padding classes. */
export type Spacing = SizeTier | "none";

/** Flex axis of a stack. */
export type StackDirection = "horizontal" | "vertical";

/** Breakpoints a responsive `direction` can switch at (mobile-first: `base` is the phone). */
export type StackBreakpoint = "base" | "sm" | "md" | "lg" | "xl";

/** Per-breakpoint axis. Each key overrides the one before it as space grows. */
export type ResponsiveDirection = Partial<Record<StackBreakpoint, StackDirection>>;

// ---------------------------------------------------------------------------
// Polymorphic typing helpers (shared with HStack/VStack/ZStack)
// ---------------------------------------------------------------------------

/** The correctly-typed `ref` for whatever element/component `as` resolves to. */
export type PolymorphicRef<C extends ElementType> =
  ComponentPropsWithRef<C>["ref"];

/**
 * `OwnProps` plus whatever props the element `as` resolves to accepts, minus
 * `as` itself and any name `OwnProps` already claims (so the stack's own,
 * correctly-typed prop always wins over the element's native one).
 */
export type PolymorphicProps<
  C extends ElementType,
  OwnProps extends object,
> = OwnProps &
  Omit<ComponentPropsWithRef<C>, "as" | keyof OwnProps> & {
    /** Polymorphic element — defaults to `"div"`. */
    as?: C;
  };

// ---------------------------------------------------------------------------
// Stack (base primitive)
// ---------------------------------------------------------------------------

export interface StackOwnProps {
  /** Flex axis — a single value, or a per-breakpoint object (`{ base: "vertical", md: "horizontal" }`). */
  direction?: StackDirection | ResponsiveDirection;
  /** Gap between children. */
  spacing?: Spacing;
  /** Cross-axis alignment. */
  align?: StackAlign;
  /** Main-axis distribution. */
  justify?: StackJustify;
  /** Whether children wrap to the next line. */
  wrap?: boolean;
  /** Inset padding around the stack content. */
  inset?: Spacing;
  /** Lets the stack grow inside its own flex parent (`flex-1 min-w-0 min-h-0`). */
  fill?: boolean;
}

export type StackProps<C extends ElementType = "div"> = PolymorphicProps<
  C,
  StackOwnProps
>;

export type StackComponent = <C extends ElementType = "div">(
  props: StackProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;
