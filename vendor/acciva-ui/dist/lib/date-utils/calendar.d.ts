export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPrevMonth: boolean;
    isNextMonth: boolean;
}
export declare function getCalendarGrid(year: number, month: number): CalendarDay[];
