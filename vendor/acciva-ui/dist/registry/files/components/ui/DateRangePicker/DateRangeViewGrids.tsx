import { MONTH_NAMES_SHORT } from "@/lib/date-utils/index";
import { cn } from "@/lib/utils";
import { Grid } from "@/components/ui/Grid/index";
import type { DateRangeGridHint, DateRangeUi } from "@/components/ui/DateRangePicker/types";
import { getViewWindows } from "@/components/ui/DateRangePicker/viewWindows";

interface DateRangeViewGridsProps {
  ui: DateRangeUi;
  gridHint: DateRangeGridHint;
}

export function DateRangeViewGrids({ ui, gridHint }: DateRangeViewGridsProps) {
  const { viewMode, viewDate, startDate, endDate, setViewDate, setViewMode } = ui;
  const { yearsWindow, decadesWindow } = getViewWindows(viewDate);

  return (
    <>
      {viewMode === "month" ? (
        <Grid role="grid" aria-describedby={gridHint.describedBy()} aria-label={`Select month for ${viewDate.getFullYear()}`} columns={3} spacing="sm" className="pt-1">
          {MONTH_NAMES_SHORT.map((mShort, mIndex) => {
            const isCurrentM = viewDate.getMonth() === mIndex;
            const isSelectedM =
              (startDate && startDate.getFullYear() === viewDate.getFullYear() && startDate.getMonth() === mIndex) ||
              (endDate && endDate.getFullYear() === viewDate.getFullYear() && endDate.getMonth() === mIndex);

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
            const isSelectedY =
              (startDate && startDate.getFullYear() === yearNum) ||
              (endDate && endDate.getFullYear() === yearNum);
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
            const isSelectedDecade =
              (startDate && startDate.getFullYear() >= decade.start && startDate.getFullYear() <= decade.end) ||
              (endDate && endDate.getFullYear() >= decade.start && endDate.getFullYear() <= decade.end);

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
