"use client";

import { forwardRef, useCallback, useId, useRef, useState } from "react";
import { formatDefaultDate } from "@/lib/date-utils/index";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { DEFAULT_PRESETS } from "@/components/ui/DatePicker/datePresets";
import { DatePickerDialog } from "@/components/ui/DatePicker/DatePickerDialog";
import { DatePickerLabel, DatePickerMessages } from "@/components/ui/DatePicker/DatePickerParts";
import { DatePickerClearButton, DatePickerTrigger } from "@/components/ui/DatePicker/DatePickerTrigger";
import { createDatePickerKeys } from "@/components/ui/DatePicker/datePickerKeys";
import type { DatePickerProps } from "@/components/ui/DatePicker/types";
import { useDatePickerSelection } from "@/components/ui/DatePicker/useDatePickerSelection";
import { useDatePickerView } from "@/components/ui/DatePicker/useDatePickerView";

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    value,
    defaultValue,
    onChange,
    placeholder = "Select date…",
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
    presets = DEFAULT_PRESETS,
    showPresets = false,
    formatDate = formatDefaultDate,
    size = "md",
    className,
    id,
    name,
    closeOnSelect = true,
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

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridHint = useArrowHint("date-grid", arrowHint, "Use arrow keys to move between days");

  const [isOpen, setIsOpen] = useState(false);
  const closeAndFocusTrigger = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const selection = useDatePickerSelection(
    { value, defaultValue, onChange, minDate, maxDate, disabledDates, disabled, readOnly, clearable, closeOnSelect },
    closeAndFocusTrigger,
  );
  const view = useDatePickerView({ selectedDate: selection.selectedDate, isOpen, setIsOpen, containerRef, gridRef });
  const keys = createDatePickerKeys({
    ...view,
    ...selection,
    disabled,
    readOnly,
    isOpen,
    setIsOpen,
    close: closeAndFocusTrigger,
  });

  const setTriggerNode = (node: HTMLButtonElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };

  return (
    <VStack spacing="sm" className={cn("w-full", className)}>
      <DatePickerLabel id={labelId} htmlFor={inputId} label={label} required={required} size={size} />

      <div ref={containerRef} className="relative" onBlur={keys.handleContainerBlur}>
        <DatePickerTrigger
          ref={setTriggerNode}
          id={inputId}
          name={name}
          labelledBy={label ? `${labelId} ${inputId}` : undefined}
          describedBy={describedByIds}
          dialogId={dialogId}
          isOpen={isOpen}
          disabled={disabled}
          readOnly={readOnly}
          invalid={Boolean(error)}
          size={size}
          leadingIcon={leadingIcon}
          hasValue={Boolean(selection.selectedDate)}
          text={selection.selectedDate ? formatDate(selection.selectedDate) : placeholder}
          showClear={selection.showClear}
          onClick={() => {
            if (!disabled && !readOnly) setIsOpen((prev) => !prev);
          }}
          onKeyDown={keys.handleTriggerKeyDown}
        />

        {selection.showClear ? <DatePickerClearButton size={size} onClear={selection.handleClear} /> : null}

        {isOpen ? (
          <DatePickerDialog
            dialogId={dialogId}
            gridRef={gridRef}
            gridHint={gridHint}
            view={view}
            selection={selection}
            keys={keys}
            presets={presets}
            showPresets={showPresets}
            clearable={clearable}
            closeOnSelect={closeOnSelect}
            setIsOpen={setIsOpen}
          />
        ) : null}
      </div>

      <DatePickerMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </VStack>
  );
});
