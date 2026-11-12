import type { FocusEvent, KeyboardEvent } from "react";
import type { CalendarViewMode } from "@/components/ui/DatePicker/types";
import { handleDayGridKey, type DayGridKeyContext } from "@/components/ui/DatePicker/dayGridKeys";
import { handleViewGridKey } from "@/components/ui/DatePicker/viewGridKeys";

export interface DatePickerKeysContext extends DayGridKeyContext {
  disabled: boolean;
  readOnly: boolean;
  isOpen: boolean;
  viewMode: CalendarViewMode;
  setIsOpen: (open: boolean) => void;
  setViewMode: (mode: CalendarViewMode) => void;
}

export function createDatePickerKeys(ctx: DatePickerKeysContext) {
  const { disabled, readOnly, isOpen, setIsOpen, viewMode, viewDate, setViewDate, setViewMode } = ctx;

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
    ctx.close();
  };

  // Focus leaving the whole picker (Tab past the dialog) closes it, like Select.
  const handleContainerBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (isOpen && next && !event.currentTarget.contains(next)) setIsOpen(false);
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
    if (viewMode === "day") {
      handleDayGridKey(event, ctx);
    } else {
      handleViewGridKey(event, viewMode, viewDate, setViewDate, setViewMode);
    }
  };

  return { handleDialogKeyDown, handleContainerBlur, handleTriggerKeyDown, handleGridKeyDown };
}

export type DatePickerKeyHandlers = ReturnType<typeof createDatePickerKeys>;
