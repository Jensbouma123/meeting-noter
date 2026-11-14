import type { KeyboardEvent } from "react";
import type { CalendarViewMode } from "../DatePicker/types.js";
/** Shared calendar-grid keyboard model for DatePicker and DateRangePicker. */
export interface CalendarDayKeyContext {
    focusedDate: Date;
    viewDate: Date;
    isDateDisabled: (date: Date) => boolean;
    handleSelectDate: (date: Date) => void;
    moveFocusRef: {
        current: boolean;
    };
    setFocusedDate: (date: Date) => void;
    setViewDate: (date: Date) => void;
    close: () => void;
    /** Runs when an arrow or paging key moves focus, before the focused date is set. */
    onFocusMove?: (date: Date) => void;
}
/** Day grid: arrows, paging, Home/End move focus; Enter/Space select; Escape closes. */
export declare function handleCalendarDayKey(event: KeyboardEvent<HTMLDivElement>, ctx: CalendarDayKeyContext): void;
/** Month, year and decade views: arrows move the window, Enter/Escape step the view mode. */
export declare function handleCalendarViewKey(event: KeyboardEvent<HTMLDivElement>, viewMode: CalendarViewMode, viewDate: Date, setViewDate: (date: Date) => void, setViewMode: (mode: CalendarViewMode) => void): void;
