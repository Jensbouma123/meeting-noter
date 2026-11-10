export function isSameDay(a, b) {
    if (!a || !b)
        return false;
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
export function isSameMonth(a, b) {
    if (!a || !b)
        return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
export function isSameYear(a, b) {
    if (!a || !b)
        return false;
    return a.getFullYear() === b.getFullYear();
}
export function isBeforeDay(a, b) {
    const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return dateA < dateB;
}
export function isAfterDay(a, b) {
    const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return dateA > dateB;
}
export function isDateInRange(date, start, end) {
    if (!start || !end)
        return false;
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const minTime = Math.min(startTime, endTime);
    const maxTime = Math.max(startTime, endTime);
    return target >= minTime && target <= maxTime;
}
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
export function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}
export function addYears(date, years) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}
export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
export function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
export const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTH_NAMES_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
export const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const WEEKDAYS_FULL = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
export function formatDefaultDate(date) {
    const month = MONTH_NAMES_SHORT[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}
export function formatMonthYear(date) {
    return `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;
}
export function formatAriaDate(date) {
    return `${WEEKDAYS_FULL[date.getDay()]}, ${MONTH_NAMES_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
export function normalizeDate(input) {
    if (!input)
        return null;
    if (input instanceof Date)
        return Number.isNaN(input.getTime()) ? null : input;
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export function getCalendarGrid(year, month) {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    const grid = [];
    // Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        grid.push({
            date,
            isCurrentMonth: false,
            isToday: isSameDay(date, today),
            isPrevMonth: true,
            isNextMonth: false,
        });
    }
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        grid.push({
            date,
            isCurrentMonth: true,
            isToday: isSameDay(date, today),
            isPrevMonth: false,
            isNextMonth: false,
        });
    }
    // Next month leading days to complete full 6 weeks (42 days) or full grid
    const remainingCells = 42 - grid.length;
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        grid.push({
            date,
            isCurrentMonth: false,
            isToday: isSameDay(date, today),
            isPrevMonth: false,
            isNextMonth: true,
        });
    }
    return grid;
}
