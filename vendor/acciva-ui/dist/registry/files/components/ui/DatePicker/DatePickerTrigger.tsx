import type { KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
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

export interface DatePickerTriggerProps {
  ref: Ref<HTMLButtonElement>;
  id: string;
  name?: string;
  labelledBy?: string;
  describedBy?: string;
  dialogId: string;
  isOpen: boolean;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
  size: ResponsiveSize<SizeTier>;
  leadingIcon?: ReactNode;
  hasValue: boolean;
  text: string;
  showClear: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export function DatePickerTrigger({
  ref,
  id,
  name,
  labelledBy,
  describedBy,
  dialogId,
  isOpen,
  disabled,
  readOnly,
  invalid,
  size,
  leadingIcon,
  hasValue,
  text,
  showClear,
  onClick,
  onKeyDown,
}: DatePickerTriggerProps) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="combobox"
      name={name}
      disabled={disabled}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls={dialogId}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-ring relative flex w-full items-center text-left border bg-background text-foreground transition-colors motion-feedback",
        disabled && "cursor-not-allowed opacity-60 bg-elevation-2",
        readOnly && "cursor-default bg-elevation-1",
        invalid ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60",
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

      <span className={cn("truncate", !hasValue && "text-muted-foreground")}>{text}</span>
    </button>
  );
}

export function DatePickerClearButton({
  size,
  onClear,
}: {
  size: ResponsiveSize<SizeTier>;
  onClear: (event?: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Clear date selection"
      onClick={onClear}
      className={cn(
        "focus-ring absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3",
        resolveResponsive(size, INPUT_ICON_INSET_TRAILING),
        resolveResponsive(size, ICON_SCALE_CLASS),
      )}
    >
      <X className="size-3.5" />
    </button>
  );
}
