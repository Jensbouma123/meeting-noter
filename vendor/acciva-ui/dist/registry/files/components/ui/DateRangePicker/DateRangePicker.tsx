"use client";

import { forwardRef, useId, useMemo } from "react";
import { formatDefaultDate } from "@/lib/date-utils/index";
import { resolveResponsive, TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { DateRangeDialog } from "@/components/ui/DateRangePicker/DateRangeDialog";
import { RangeTrigger } from "@/components/ui/DateRangePicker/DateRangePickerParts";
import { getDefaultRangePresets } from "@/components/ui/DateRangePicker/presets";
import type { DateRangePickerProps } from "@/components/ui/DateRangePicker/types";
import { useDateRangeCalendar } from "@/components/ui/DateRangePicker/useDateRangeCalendar";
import { useDateRangeKeys } from "@/components/ui/DateRangePicker/useDateRangeKeys";
import { useDateRangeValue } from "@/components/ui/DateRangePicker/useDateRangeValue";

export type { DateRangePickerProps, DateRangePreset, DateRangeTuple } from "@/components/ui/DateRangePicker/types";

export const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(function DateRangePicker(
  {
    value,
    defaultValue,
    onChange,
    placeholder = "Select date range…",
    label,
    hint,
    error,
    required,
    disabled = false,
    readOnly = false,
    clearable = false,
    minDate,
    maxDate,
    disabledDates,
    presets,
    showPresets = false,
    formatDate = formatDefaultDate,
    size = "md",
    className,
    id,
    name,
    closeOnSelect = false,
    leadingIcon,
    "aria-describedby": describedBy,
    arrowHint,
  },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const dialogId = `${inputId}-dialog`;
  const labelId = `${inputId}-label`;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const gridHint = useArrowHint("date-grid", arrowHint, "Use arrow keys to move between days");

  const range = useDateRangeValue({ value, defaultValue, onChange, minDate, maxDate, disabledDates });
  const calendar = useDateRangeCalendar(range.startDate);
  const state = { ...range, ...calendar };
  const keys = useDateRangeKeys(state, { disabled, readOnly, closeOnSelect });
  const ui = { ...state, ...keys };

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    calendar.triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };

  const { startDate, endDate, hasSelection } = range;
  const resolvedPresets = useMemo(() => presets ?? getDefaultRangePresets(), [presets]);
  const displayString = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    }
    if (startDate) {
      return `${formatDate(startDate)} – …`;
    }
    return placeholder;
  }, [startDate, endDate, formatDate, placeholder]);
  const showClear = clearable && !disabled && !readOnly && hasSelection;

  return (
    <VStack spacing="sm" className={cn("w-full", className)}>
      {label ? (
        <label id={labelId} htmlFor={inputId} className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}

      <div ref={calendar.containerRef} className="relative" onBlur={keys.handleContainerBlur}>
        <RangeTrigger
          ui={ui}
          setTriggerRef={setTriggerRef}
          inputId={inputId}
          labelId={labelId}
          dialogId={dialogId}
          label={label}
          name={name}
          disabled={disabled}
          readOnly={readOnly}
          error={error}
          size={size}
          leadingIcon={leadingIcon}
          describedByIds={describedByIds}
          displayString={displayString}
          showClear={showClear}
        />

        {ui.isOpen ? (
          <DateRangeDialog
            ui={ui}
            dialogId={dialogId}
            gridHint={gridHint}
            presets={resolvedPresets}
            showPresets={showPresets}
            clearable={clearable}
          />
        ) : null}
      </div>

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
          {error}
        </p>
      ) : null}
    </VStack>
  );
});
