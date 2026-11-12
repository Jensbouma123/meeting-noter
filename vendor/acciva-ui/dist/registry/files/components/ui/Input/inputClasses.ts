import {
  CONTROL_HEIGHT,
  CONTROL_RADIUS,
  INPUT_ICON_PADDING_LEADING,
  INPUT_ICON_PADDING_TRAILING,
  INPUT_PADDING_X,
  TEXT_SIZE,
  TRIPLE_TRAILING_PADDING,
  resolveResponsive,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { ADDON_JOIN_CLASSES, DOUBLE_TRAILING_PADDING } from "@/components/ui/Input/constants";

type AddonJoin = keyof typeof ADDON_JOIN_CLASSES;

function trailingPaddingClass(size: ResponsiveSize<SizeTier>, trailingCount: number) {
  return trailingCount === 0
    ? resolveResponsive(size, INPUT_PADDING_X)
    : trailingCount === 1
      ? resolveResponsive(size, INPUT_ICON_PADDING_TRAILING)
      : trailingCount === 2
        ? resolveResponsive(size, DOUBLE_TRAILING_PADDING)
        : resolveResponsive(size, TRIPLE_TRAILING_PADDING);
}

function addonJoinFor(hasLeadingAddon: boolean, hasTrailingAddon: boolean): AddonJoin {
  return hasLeadingAddon && hasTrailingAddon
    ? "both"
    : hasLeadingAddon
      ? "leading"
      : hasTrailingAddon
        ? "trailing"
        : "none";
}

export function inputClassName(
  size: ResponsiveSize<SizeTier>,
  type: string,
  disabled: boolean | undefined,
  readOnly: boolean | undefined,
  isInvalid: boolean,
  hasLeadingIcon: boolean,
  trailingCount: number,
  hasLeadingAddon: boolean,
  hasTrailingAddon: boolean,
  className: string | undefined,
) {
  return cn(
    "focus-ring w-full border bg-background text-foreground placeholder:text-muted-foreground",
    "transition-colors motion-feedback",
    disabled && "cursor-not-allowed opacity-60 bg-elevation-2",
    readOnly && "cursor-default bg-elevation-1",
    isInvalid ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60",
    type === "number" &&
      "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]",
    type === "search" &&
      "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
    resolveResponsive(size, CONTROL_HEIGHT),
    resolveResponsive(size, CONTROL_RADIUS),
    resolveResponsive(size, TEXT_SIZE),
    hasLeadingIcon ? resolveResponsive(size, INPUT_ICON_PADDING_LEADING) : resolveResponsive(size, INPUT_PADDING_X),
    trailingPaddingClass(size, trailingCount),
    ADDON_JOIN_CLASSES[addonJoinFor(hasLeadingAddon, hasTrailingAddon)],
    className,
  );
}
