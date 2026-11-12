import type { RefObject } from "react";
import { ArrowHint } from "@/lib/ArrowHint";
import { SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import type { DatePickerGridHint, DatePickerPreset } from "@/components/ui/DatePicker/types";
import type { DatePickerKeyHandlers } from "@/components/ui/DatePicker/datePickerKeys";
import type { DatePickerSelectionModel } from "@/components/ui/DatePicker/useDatePickerSelection";
import type { DatePickerViewModel } from "@/components/ui/DatePicker/useDatePickerView";
import { DatePickerDayGrid } from "@/components/ui/DatePicker/DatePickerDayGrid";
import { DatePickerViewGrids } from "@/components/ui/DatePicker/DatePickerViewGrids";
import { DatePickerFooter, DatePickerPresets, DatePickerViewHeader } from "@/components/ui/DatePicker/DatePickerDialogParts";

export interface DatePickerDialogProps {
  dialogId: string;
  gridRef: RefObject<HTMLDivElement | null>;
  gridHint: DatePickerGridHint;
  view: DatePickerViewModel;
  selection: DatePickerSelectionModel;
  keys: DatePickerKeyHandlers;
  presets: readonly DatePickerPreset[];
  showPresets: boolean;
  clearable: boolean;
  closeOnSelect: boolean;
  setIsOpen: (open: boolean) => void;
}

export function DatePickerDialog({
  dialogId,
  gridRef,
  gridHint,
  view,
  selection,
  keys,
  presets,
  showPresets,
  clearable,
  closeOnSelect,
  setIsOpen,
}: DatePickerDialogProps) {
  return (
    <div
      id={dialogId}
      role="dialog"
      tabIndex={-1}
      onKeyDown={keys.handleDialogKeyDown}
      aria-modal="false"
      aria-label="Choose date"
      className={`absolute left-0 z-50 mt-2 w-72 border border-border bg-surface p-3 animate-fade-in focus:outline-none ${SURFACE_RADIUS.overlay} ${SURFACE_SHADOW.overlay}`}
    >
      {showPresets && presets && presets.length > 0 ? (
        <DatePickerPresets presets={presets} selectedDate={selection.selectedDate} onSelect={selection.handleSelectDate} />
      ) : null}

      <DatePickerViewHeader view={view} />

      <div ref={gridRef} onKeyDown={keys.handleGridKeyDown} {...gridHint.groupProps} className="relative focus:outline-none">
        {view.viewMode === "day" ? <DatePickerDayGrid view={view} selection={selection} gridHint={gridHint} /> : null}
        <DatePickerViewGrids view={view} selection={selection} gridHint={gridHint} />
        <ArrowHint id={gridHint.id} text={gridHint.text} visible={gridHint.visible} className="top-auto bottom-0 mb-1" />
      </div>

      <DatePickerFooter
        view={view}
        selection={selection}
        clearable={clearable}
        closeOnSelect={closeOnSelect}
        setIsOpen={setIsOpen}
      />
    </div>
  );
}
