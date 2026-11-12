import { useCallback, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import { isBeforeDay, startOfDay } from "@/lib/date-utils/index";
import { handleDayGridKey } from "@/components/ui/DateRangePicker/dayGridKeys";
import { handleViewGridKey } from "@/components/ui/DateRangePicker/viewGridKeys";
import type { DateRangePreset, DateRangeState, DateRangeTuple } from "@/components/ui/DateRangePicker/types";

interface KeysOptions {
  disabled: boolean;
  readOnly: boolean;
  closeOnSelect: boolean;
}

export function useDateRangeKeys(state: DateRangeState, { disabled, readOnly, closeOnSelect }: KeysOptions) {
  const { startDate, endDate, isDateDisabled, commitRange, isOpen, setIsOpen, triggerRef, viewMode } = state;

  const handleSelectDate = useCallback(
    (targetDate: Date) => {
      if (disabled || readOnly || isDateDisabled(targetDate)) return;
      const normalized = startOfDay(targetDate);

      let nextRange: DateRangeTuple;

      if (!startDate || (startDate && endDate)) {
        // First click in new range
        nextRange = [normalized, null];
      } else {
        // Second click
        if (isBeforeDay(normalized, startDate)) {
          nextRange = [normalized, startDate];
        } else {
          nextRange = [startDate, normalized];
        }
      }

      commitRange(nextRange);

      if (nextRange[0] && nextRange[1] && closeOnSelect) {
        setIsOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    },
    [disabled, readOnly, isDateDisabled, startDate, endDate, commitRange, closeOnSelect, setIsOpen, triggerRef],
  );

  const handleClear = useCallback(
    (event?: MouseEvent) => {
      event?.stopPropagation();
      if (disabled || readOnly) return;
      commitRange([null, null]);
    },
    [disabled, readOnly, commitRange],
  );

  const handleFooterClear = () => {
    handleClear();
    if (closeOnSelect) setIsOpen(false);
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    commitRange([preset.value[0], preset.value[1]]);
    if (closeOnSelect) setIsOpen(false);
  };

  // Escape anywhere in the dialog (presets, header, grid) closes it and returns focus to the trigger.
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      // Tab cycles prev, label, next, grid (and presets/clear) inside the dialog; Escape is the way out.
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])'),
      );
      const edge = event.shiftKey ? items[0] : items[items.length - 1];
      if (items.length > 0 && (document.activeElement === edge || document.activeElement === event.currentTarget)) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus({ preventScroll: true });
      }
      return;
    }
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  // Focus leaving the whole picker (Tab past the dialog) closes it, like Select.
  const handleContainerBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (isOpen && next && !event.currentTarget.contains(next)) setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (!disabled && !readOnly) setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || readOnly) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    } else if (event.key === "Tab" && isOpen) {
      // Allow standard Tab navigation through calendar popover
    }
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    if (viewMode === "day") handleDayGridKey(event, state, handleSelectDate);
    else handleViewGridKey(event, viewMode, state);
  };

  return {
    handleSelectDate,
    handleClear,
    handleFooterClear,
    handlePresetSelect,
    handleDialogKeyDown,
    handleContainerBlur,
    handleTriggerClick,
    handleTriggerKeyDown,
    handleGridKeyDown,
  };
}
