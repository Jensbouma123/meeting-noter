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
