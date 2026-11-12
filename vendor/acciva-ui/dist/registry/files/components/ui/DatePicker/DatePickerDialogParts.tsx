import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay } from "@/lib/date-utils/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import type { DatePickerPreset } from "@/components/ui/DatePicker/types";
import type { DatePickerSelectionModel } from "@/components/ui/DatePicker/useDatePickerSelection";
import type { DatePickerViewModel } from "@/components/ui/DatePicker/useDatePickerView";

export function DatePickerPresets({
  presets,
  selectedDate,
  onSelect,
}: {
  presets: readonly DatePickerPreset[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  return (
    <HStack wrap spacing="xs" className="mb-3 border-b border-border/80 pb-2">
      {presets.map((preset) => {
        const isPresetActive = selectedDate && isSameDay(selectedDate, preset.value);
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelect(preset.value)}
            className={cn(
              "focus-ring rounded-md px-3 py-1 text-xs font-medium transition-colors",
              isPresetActive
                ? "bg-primary-600 text-button-primary-foreground font-semibold shadow-xs dark:bg-primary-500"
                : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4",
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </HStack>
  );
}

export function DatePickerViewHeader({ view }: { view: DatePickerViewModel }) {
  return (
    <HStack justify="between" spacing="xs" className="pb-2">
      <button
        type="button"
        aria-label="Previous view"
        onClick={view.handlePrevView}
        className="touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
      >
        <ChevronLeft className="size-4" />
      </button>

      <button
        type="button"
        aria-label={`Current view: ${view.viewHeaderLabel}. Click to change view mode`}
        onClick={view.cycleViewMode}
        className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-elevation-2 dark:hover:bg-elevation-3"
      >
        {view.viewHeaderLabel}
      </button>

      <button
        type="button"
        aria-label="Next view"
        onClick={view.handleNextView}
        className="touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
      >
        <ChevronRight className="size-4" />
      </button>
    </HStack>
  );
}

export function DatePickerFooter({
  view,
  selection,
  clearable,
  closeOnSelect,
  setIsOpen,
}: {
  view: DatePickerViewModel;
  selection: DatePickerSelectionModel;
  clearable: boolean;
  closeOnSelect: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  return (
    <HStack justify="between" spacing="none" className="mt-3 border-t border-border/80 pt-2">
      <button
        type="button"
        onClick={() => {
          const today = new Date();
          view.setViewDate(today);
          selection.handleSelectDate(today);
        }}
        className="focus-ring rounded-md px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-500/10 active:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-400/20 transition-colors"
      >
        Today
      </button>

      {clearable ? (
        <button
          type="button"
          onClick={() => {
            selection.handleClear();
            if (closeOnSelect) setIsOpen(false);
          }}
          className="focus-ring rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
        >
          Clear
        </button>
      ) : null}
    </HStack>
  );
}
