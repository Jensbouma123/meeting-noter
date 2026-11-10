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
