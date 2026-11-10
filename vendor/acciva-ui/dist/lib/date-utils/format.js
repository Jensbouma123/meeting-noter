import { MONTH_NAMES_FULL, MONTH_NAMES_SHORT, WEEKDAYS_FULL } from "./constants.js";
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
