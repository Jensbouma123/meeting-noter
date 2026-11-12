import type {
  ScrollViewGap,
  ScrollViewPadding,
  ScrollViewScrollbar,
  ScrollViewSnap,
  ScrollViewWrapAt,
} from "@/components/ui/ScrollView/types";

export const GAP_CLASSES: Record<ScrollViewGap, string> = {
  none: "gap-0",
  xs: "gap-1.5",
  sm: "gap-2.5",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export const PADDING_CLASSES: Record<ScrollViewPadding, string> = {
  none: "p-0",
  xs: "p-1.5",
  sm: "p-2.5",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
};

export const WRAP_AT_CLASSES: Record<ScrollViewWrapAt, string> = {
  never: "flex-nowrap",
  // No --breakpoint-xs exists; the phone-portrait case is the unprefixed base, so xs wraps always.
  xs: "flex-wrap overflow-visible!",
  sm: "sm:flex-wrap sm:overflow-visible",
  md: "md:flex-wrap md:overflow-visible",
  lg: "lg:flex-wrap lg:overflow-visible",
  xl: "xl:flex-wrap xl:overflow-visible",
};

export const WRAP_AT_HIDE_CONTROLS_CLASSES: Record<ScrollViewWrapAt, string> = {
  never: "",
  xs: "hidden!",
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
};

export function getSnapClasses(snap: ScrollViewSnap, isHorizontal: boolean): string {
  return {
    none: "",
    start: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-start" : "snap-y snap-mandatory [&>*]:snap-start",
    center: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-center" : "snap-y snap-mandatory [&>*]:snap-center",
    mandatory: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-start" : "snap-y snap-mandatory [&>*]:snap-start",
    proximity: isHorizontal ? "snap-x snap-proximity [&>*]:snap-start" : "snap-y snap-proximity [&>*]:snap-start",
  }[snap];
}

export function getScrollbarClasses(scrollbar: ScrollViewScrollbar, isHorizontal: boolean): string {
  return {
    auto: isHorizontal ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden",
    always: isHorizontal ? "overflow-x-scroll overflow-y-hidden" : "overflow-y-scroll overflow-x-hidden",
    hidden: isHorizontal
      ? "overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      : "overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
  }[scrollbar];
}
