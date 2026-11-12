import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { formatAriaDate, formatMonthYear, isSameDay, isSameMonth } from "@/lib/date-utils/index";
import { cn } from "@/lib/utils";
import { Grid } from "@/components/ui/Grid/index";
import type { DatePickerGridHint } from "@/components/ui/DatePicker/types";
import type { DatePickerSelectionModel } from "@/components/ui/DatePicker/useDatePickerSelection";
import type { DatePickerViewModel } from "@/components/ui/DatePicker/useDatePickerView";

export function DatePickerDayGrid({
  view,
  selection,
  gridHint,
}: {
  view: DatePickerViewModel;
  selection: DatePickerSelectionModel;
  gridHint: DatePickerGridHint;
}) {
  const { viewDate, focusedDate, calendarGrid } = view;
  const { selectedDate, isDateDisabled, handleSelectDate } = selection;

  return (
    <div role="grid" aria-describedby={gridHint.describedBy()} aria-label={formatMonthYear(viewDate)} className="flex flex-col gap-y-1">
      <Grid role="row" columns={7} spacing="none" className="text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
          <span
            key={dayName}
            role="columnheader"
            aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx]}
            className={cn("py-1 font-semibold text-muted-foreground", TEXT_SIZE.xxs)}
          >
            {dayName}
          </span>
        ))}
      </Grid>

      {Array.from({ length: Math.ceil(calendarGrid.length / 7) }, (_, week) => (
        <Grid key={week} role="row" columns={7} spacing="none">
          {calendarGrid.slice(week * 7, week * 7 + 7).map((day) => {
            const isSelected = selectedDate ? isSameDay(selectedDate, day.date) : false;
            // One tab stop: the focused day, or the 1st when the viewed month does not hold it.
            const isFocused = isSameMonth(focusedDate, viewDate)
              ? isSameDay(focusedDate, day.date)
              : day.isCurrentMonth && day.date.getDate() === 1;
            const isDayDisabled = isDateDisabled(day.date);

            return (
              <div key={day.date.toISOString()} role="gridcell" aria-selected={isSelected} className="flex items-center justify-center">
                <button
                  type="button"
                  tabIndex={isFocused ? 0 : -1}
                  disabled={isDayDisabled}
                  aria-disabled={isDayDisabled}
                  aria-label={formatAriaDate(day.date)}
                  onClick={() => handleSelectDate(day.date)}
                  className={cn(
                    "touch-target-44 focus-ring relative flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    // A day outside the viewed month is still an enabled, selectable
                    // date — only `isDayDisabled` withdraws it — so it is meaningful
                    // text under SC 1.4.3, not a disabled control.
                    day.isCurrentMonth ? "text-foreground" : "text-subtle-foreground",
                    isSelected
                      ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                      : "hover:bg-elevation-2 dark:hover:bg-elevation-3",
                    day.isToday && !isSelected && "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400",
                    isDayDisabled && "cursor-not-allowed opacity-60 line-through hover:bg-transparent dark:hover:bg-transparent",
                  )}
                >
                  {day.date.getDate()}
                </button>
              </div>
            );
          })}
        </Grid>
      ))}
    </div>
  );
}
