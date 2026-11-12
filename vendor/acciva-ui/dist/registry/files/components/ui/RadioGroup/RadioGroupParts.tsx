import { resolveResponsive, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

const RADIO_CIRCLE_OUTER: Record<SizeTier, string> = {
  xxs: "size-3.5",
  xs: "size-4",
  sm: "size-4.5",
  md: "size-5",
  lg: "size-5.5",
  xl: "size-6",
  "2xl": "size-7",
  "3xl": "size-8",
};

const RADIO_CIRCLE_INNER: Record<SizeTier, string> = {
  xxs: "size-1.5",
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2",
  lg: "size-2.5",
  xl: "size-2.5",
  "2xl": "size-3",
  "3xl": "size-3.5",
};

/** The decorative circle-and-dot indicator. Hidden from assistive tech; the button carries the name. */
export function RadioCircle({
  size,
  isChecked,
  isDisabled,
}: {
  size: ResponsiveSize<SizeTier>;
  isChecked: boolean;
  isDisabled: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all motion-feedback",
        resolveResponsive(size, RADIO_CIRCLE_OUTER),
        isChecked
          ? "border-primary-500 bg-primary-500 text-button-primary-foreground"
          : "border-border bg-background hover:border-muted-foreground/60 active:border-muted-foreground group-active:border-muted-foreground",
        isDisabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white transition-transform motion-feedback",
          resolveResponsive(size, RADIO_CIRCLE_INNER),
          isChecked ? "scale-100" : "scale-0",
        )}
      />
    </span>
  );
}
