import type { ReactNode } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import {
  CONTROL_HEIGHT,
  CONTROL_RADIUS,
  ICON_SCALE_CLASS,
  INPUT_ICON_INSET,
  INPUT_ICON_INSET_TRAILING,
  INPUT_ICON_PADDING_LEADING,
  INPUT_ICON_PADDING_TRAILING,
  INPUT_PADDING_X,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import type { DateRangeUi } from "@/components/ui/DateRangePicker/types";

interface RangeTriggerProps {
  ui: DateRangeUi;
  setTriggerRef: (node: HTMLButtonElement | null) => void;
  inputId: string;
  labelId: string;
  dialogId: string;
  label?: string;
  name?: string;
  disabled: boolean;
  readOnly: boolean;
  error?: string;
  size: ResponsiveSize<SizeTier>;
  leadingIcon?: ReactNode;
  describedByIds?: string;
  displayString: string;
  showClear: boolean;
}

export function RangeTrigger({
  ui,
  setTriggerRef,
  inputId,
  labelId,
  dialogId,
  label,
  name,
  disabled,
  readOnly,
  error,
  size,
  leadingIcon,
  describedByIds,
  displayString,
  showClear,
}: RangeTriggerProps) {
  const { isOpen, hasSelection, handleClear, handleTriggerClick, handleTriggerKeyDown } = ui;

  return (
    <>
      <button
        ref={setTriggerRef}
        id={inputId}
        type="button"
        role="combobox"
        name={name}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-labelledby={label ? `${labelId} ${inputId}` : undefined}
        aria-describedby={describedByIds}
        aria-invalid={error ? true : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "focus-ring relative flex w-full items-center text-left border bg-background text-foreground transition-colors motion-feedback",
          disabled && "cursor-not-allowed opacity-60 bg-elevation-2",
          readOnly && "cursor-default bg-elevation-1",
          error ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60",
          resolveResponsive(size, CONTROL_HEIGHT),
          resolveResponsive(size, CONTROL_RADIUS),
          resolveResponsive(size, TEXT_SIZE),
          leadingIcon ? resolveResponsive(size, INPUT_ICON_PADDING_LEADING) : resolveResponsive(size, INPUT_ICON_PADDING_LEADING),
          showClear ? resolveResponsive(size, INPUT_ICON_PADDING_TRAILING) : resolveResponsive(size, INPUT_PADDING_X),
          typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
              ? TOUCH_TARGET_CLASS
              : undefined,
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
            resolveResponsive(size, INPUT_ICON_INSET),
            resolveResponsive(size, ICON_SCALE_CLASS),
          )}
        >
          {leadingIcon ?? <CalendarIcon className="shrink-0" />}
        </span>

        <span className={cn("truncate", !hasSelection && "text-muted-foreground")}>
          {displayString}
        </span>
      </button>

      {showClear ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear date range"
          onClick={handleClear}
          className={cn(
            "focus-ring absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3",
            resolveResponsive(size, INPUT_ICON_INSET_TRAILING),
            resolveResponsive(size, ICON_SCALE_CLASS),
          )}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </>
  );
}
