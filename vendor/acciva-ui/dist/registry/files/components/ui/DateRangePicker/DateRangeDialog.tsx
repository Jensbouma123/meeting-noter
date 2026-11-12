import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowHint } from "@/lib/ArrowHint";
import { SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import { HStack } from "@/components/ui/HStack";
import { DateRangeDayGrid } from "@/components/ui/DateRangePicker/DateRangeDayGrid";
import { DateRangePresets } from "@/components/ui/DateRangePicker/DateRangePresets";
import { DateRangeViewGrids } from "@/components/ui/DateRangePicker/DateRangeViewGrids";
import type { DateRangeGridHint, DateRangePreset, DateRangeUi } from "@/components/ui/DateRangePicker/types";
import { getViewHeaderLabel } from "@/components/ui/DateRangePicker/viewWindows";

interface DateRangeDialogProps {
  ui: DateRangeUi;
  dialogId: string;
  gridHint: DateRangeGridHint;
  presets: readonly DateRangePreset[];
  showPresets: boolean;
  clearable: boolean;
}

export function DateRangeDialog({ ui, dialogId, gridHint, presets, showPresets, clearable }: DateRangeDialogProps) {
  const {
    viewMode,
    viewDate,
    startDate,
    rangeSummary,
    gridRef,
    handleDialogKeyDown,
    handleGridKeyDown,
    handlePrevView,
    handleNextView,
    cycleViewMode,
    handleFooterClear,
  } = ui;
  const viewHeaderLabel = getViewHeaderLabel(viewMode, viewDate);

  return (
    <div
      id={dialogId}
      role="dialog"
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      aria-modal="false"
      aria-label="Choose date range"
      className={`fixed inset-x-4 z-50 mx-auto mt-2 w-auto max-w-80 sm:absolute sm:inset-x-auto sm:left-0 sm:mx-0 sm:w-80 border border-border bg-surface p-3 animate-fade-in focus:outline-none ${SURFACE_RADIUS.overlay} ${SURFACE_SHADOW.overlay}`}
    >
      {showPresets && presets.length > 0 ? <DateRangePresets ui={ui} presets={presets} /> : null}

      <HStack justify="between" spacing="xs" className="pb-2">
        <button
          type="button"
          aria-label="Previous view"
          onClick={handlePrevView}
          className="touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          aria-label={`Current view: ${viewHeaderLabel}. Click to change view mode`}
          onClick={cycleViewMode}
          className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-elevation-2 dark:hover:bg-elevation-3"
        >
          {viewHeaderLabel}
        </button>

        <button
          type="button"
          aria-label="Next view"
          onClick={handleNextView}
          className="touch-target-44 focus-ring flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
        >
          <ChevronRight className="size-4" />
        </button>
      </HStack>

      <div ref={gridRef} onKeyDown={handleGridKeyDown} {...gridHint.groupProps} className="relative focus:outline-none">
        {viewMode === "day" ? <DateRangeDayGrid ui={ui} gridHint={gridHint} /> : null}
        <DateRangeViewGrids ui={ui} gridHint={gridHint} />
        <ArrowHint id={gridHint.id} text={gridHint.text} visible={gridHint.visible} className="top-auto bottom-0 mb-1" />
      </div>

      <HStack justify="between" spacing="none" className="mt-3 border-t border-border/80 pt-2">
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {rangeSummary ?? (startDate ? "Select end date" : "Select start date")}
        </span>

        {clearable ? (
          <button
            type="button"
            onClick={handleFooterClear}
            className="focus-ring rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground dark:hover:bg-elevation-3"
          >
            Clear
          </button>
        ) : null}
      </HStack>
    </div>
  );
}
