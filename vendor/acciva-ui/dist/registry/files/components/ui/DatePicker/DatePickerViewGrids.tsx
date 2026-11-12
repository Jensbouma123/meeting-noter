import { MONTH_NAMES_SHORT } from "@/lib/date-utils/index";
import { cn } from "@/lib/utils";
import { Grid } from "@/components/ui/Grid/index";
import type { DatePickerGridHint } from "@/components/ui/DatePicker/types";
import type { DatePickerSelectionModel } from "@/components/ui/DatePicker/useDatePickerSelection";
import type { DatePickerViewModel } from "@/components/ui/DatePicker/useDatePickerView";

export function DatePickerViewGrids({
  view,
  selection,
  gridHint,
}: {
  view: DatePickerViewModel;
  selection: DatePickerSelectionModel;
  gridHint: DatePickerGridHint;
}) {
  const { viewMode, viewDate, setViewDate, setViewMode, yearsWindow, decadesWindow } = view;
  const { selectedDate } = selection;

  return (
    <>
      {viewMode === "month" ? (
        <Grid role="grid" aria-describedby={gridHint.describedBy()} aria-label={`Select month for ${viewDate.getFullYear()}`} columns={3} spacing="sm" className="pt-1">
          {MONTH_NAMES_SHORT.map((mShort, mIndex) => {
            const isCurrentM = viewDate.getMonth() === mIndex;
            const isSelectedM = selectedDate && selectedDate.getFullYear() === viewDate.getFullYear() && selectedDate.getMonth() === mIndex;

            return (
              <button
                key={mShort}
                type="button"
                onClick={() => {
                  setViewDate(new Date(viewDate.getFullYear(), mIndex, 1));
                  setViewMode("day");
                }}
                className={cn(
                  "focus-ring rounded-lg py-3 text-xs font-medium transition-colors",
                  isSelectedM
                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                    : isCurrentM
                      ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                      : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3",
                )}
              >
                {mShort}
              </button>
            );
          })}
        </Grid>
      ) : null}

      {viewMode === "year" ? (
        <Grid role="grid" aria-describedby={gridHint.describedBy()} aria-label="Select year" columns={3} spacing="sm" className="pt-1">
          {yearsWindow.map((yearNum) => {
            const isSelectedY = selectedDate && selectedDate.getFullYear() === yearNum;
            const isCurrentY = new Date().getFullYear() === yearNum;

            return (
              <button
                key={yearNum}
                type="button"
                onClick={() => {
                  setViewDate(new Date(yearNum, viewDate.getMonth(), 1));
                  setViewMode("month");
                }}
                className={cn(
                  "focus-ring rounded-lg py-3 text-xs font-medium transition-colors",
                  isSelectedY
                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                    : isCurrentY
                      ? "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400 hover:bg-elevation-2 dark:hover:bg-elevation-3"
                      : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3",
                )}
              >
                {yearNum}
              </button>
            );
          })}
        </Grid>
      ) : null}

      {viewMode === "decade" ? (
        <Grid role="grid" aria-describedby={gridHint.describedBy()} aria-label="Select decade" columns={2} spacing="sm" className="pt-1">
          {decadesWindow.map((decade) => {
            const isSelectedDecade = selectedDate && selectedDate.getFullYear() >= decade.start && selectedDate.getFullYear() <= decade.end;

            return (
              <button
                key={decade.start}
                type="button"
                onClick={() => {
                  setViewDate(new Date(decade.start, viewDate.getMonth(), 1));
                  setViewMode("year");
                }}
                className={cn(
                  "focus-ring rounded-lg px-2 py-3 text-xs font-medium transition-colors",
                  isSelectedDecade
                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                    : "text-foreground hover:bg-elevation-2 dark:hover:bg-elevation-3",
                )}
              >
                {decade.start} – {decade.end}
              </button>
            );
          })}
        </Grid>
      ) : null}
    </>
  );
}
