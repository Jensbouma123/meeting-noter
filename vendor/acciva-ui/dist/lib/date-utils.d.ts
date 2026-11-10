export declare function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean;
export declare function isSameMonth(a: Date | null | undefined, b: Date | null | undefined): boolean;
export declare function isSameYear(a: Date | null | undefined, b: Date | null | undefined): boolean;
export declare function isBeforeDay(a: Date, b: Date): boolean;
export declare function isAfterDay(a: Date, b: Date): boolean;
export declare function isDateInRange(date: Date, start: Date | null | undefined, end: Date | null | undefined): boolean;
export declare function addDays(date: Date, days: number): Date;
export declare function addMonths(date: Date, months: number): Date;
export declare function addYears(date: Date, years: number): Date;
export declare function startOfDay(date: Date): Date;
export declare function startOfMonth(date: Date): Date;
export declare function endOfMonth(date: Date): Date;
export declare function getDaysInMonth(year: number, month: number): number;
export declare const MONTH_NAMES_SHORT: readonly ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export declare const MONTH_NAMES_FULL: readonly ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export declare const WEEKDAYS_SHORT: readonly ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export declare const WEEKDAYS_FULL: readonly ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export declare function formatDefaultDate(date: Date): string;
export declare function formatMonthYear(date: Date): string;
export declare function formatAriaDate(date: Date): string;
export declare function normalizeDate(input: Date | string | number | null | undefined): Date | null;
export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPrevMonth: boolean;
    isNextMonth: boolean;
}
export declare function getCalendarGrid(year: number, month: number): CalendarDay[];
