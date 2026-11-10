import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { formatAriaDate, formatMonthYear, getCalendarGrid, isBeforeDay, isDateInRange, isSameDay, isSameMonth } from "../../../lib/date-utils/index.js";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { Grid } from "../Grid/index.js";
export function DateRangeDayGrid({ ui, gridHint }) {
    const { startDate, endDate, hoveredDate, focusedDate, viewDate, isDateDisabled, handleSelectDate, setHoveredDate, } = ui;
    const calendarGrid = useMemo(() => getCalendarGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
    return (_jsxs("div", { role: "grid", "aria-describedby": gridHint.describedBy(), "aria-label": formatMonthYear(viewDate), className: "flex flex-col gap-y-1", children: [_jsx(Grid, { role: "row", columns: 7, spacing: "none", className: "text-center", children: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (_jsx("span", { role: "columnheader", "aria-label": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx], className: cn("py-1 font-semibold text-muted-foreground", TEXT_SIZE.xxs), children: dayName }, dayName))) }), Array.from({ length: Math.ceil(calendarGrid.length / 7) }, (_, week) => (_jsx(Grid, { role: "row", columns: 7, spacing: "none", children: calendarGrid.slice(week * 7, week * 7 + 7).map((day) => {
                    const isStart = startDate ? isSameDay(startDate, day.date) : false;
                    const isEnd = endDate ? isSameDay(endDate, day.date) : false;
                    const isSelected = isStart || isEnd;
                    const isRowStart = day.date.getDay() === 0;
                    const isRowEnd = day.date.getDay() === 6;
                    // The previewed or committed far end; a lone start (or a one-day range) paints no band.
                    const farEnd = endDate ?? (startDate && hoveredDate ? hoveredDate : null);
                    const forward = !startDate || !farEnd || !isBeforeDay(farEnd, startDate);
                    const lo = forward ? startDate : farEnd;
                    const hi = forward ? farEnd : startDate;
                    const hasBand = Boolean(lo && hi && !isSameDay(lo, hi) && isDateInRange(day.date, lo, hi));
                    const isBandLo = hasBand && isSameDay(day.date, lo);
                    const isBandHi = hasBand && isSameDay(day.date, hi);
                    // One tab stop: the focused day, or the 1st when the viewed month does not hold it.
                    const isFocused = isSameMonth(focusedDate, viewDate)
                        ? isSameDay(focusedDate, day.date)
                        : day.isCurrentMonth && day.date.getDate() === 1;
                    const isDayDisabled = isDateDisabled(day.date);
                    return (_jsxs("div", { role: "gridcell", "aria-selected": isSelected, className: "relative flex h-10 items-center justify-center p-0", children: [hasBand ? (_jsx("span", { "aria-hidden": "true", "data-range-band": true, className: cn("absolute inset-y-1 bg-primary-500/15 dark:bg-primary-400/20", isBandLo ? "left-1/2 right-0" : isBandHi ? "left-0 right-1/2" : "inset-x-0", !isBandLo && !isBandHi && isRowStart && "rounded-l-full", !isBandLo && !isBandHi && isRowEnd && "rounded-r-full") })) : null, _jsx("button", { type: "button", tabIndex: isFocused ? 0 : -1, disabled: isDayDisabled, "aria-disabled": isDayDisabled, "aria-label": formatAriaDate(day.date), onClick: () => handleSelectDate(day.date), onMouseEnter: () => {
                                    if (startDate && !endDate)
                                        setHoveredDate(day.date);
                                }, className: cn("touch-target-44 focus-ring relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors", 
                                // A day outside the viewed month is still an enabled, selectable
                                // range endpoint — only `isDayDisabled` withdraws it — so it is
                                // meaningful text under SC 1.4.3, not a disabled control.
                                day.isCurrentMonth ? "text-foreground" : "text-subtle-foreground", isSelected
                                    ? "bg-primary-600 font-semibold text-button-primary-foreground shadow-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
                                    : hasBand
                                        ? "text-primary-900 font-semibold dark:text-primary-100 hover:bg-primary-500/25 dark:hover:bg-primary-400/30"
                                        : "hover:bg-elevation-2 dark:hover:bg-elevation-3", day.isToday && !isSelected && "border border-primary-500 font-semibold text-primary-600 dark:text-primary-400", isDayDisabled && "cursor-not-allowed opacity-60 line-through hover:bg-transparent dark:hover:bg-transparent"), children: day.date.getDate() })] }, day.date.toISOString()));
                }) }, week)))] }));
}
