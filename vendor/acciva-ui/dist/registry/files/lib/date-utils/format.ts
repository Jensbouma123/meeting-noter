import { MONTH_NAMES_FULL, MONTH_NAMES_SHORT, WEEKDAYS_FULL } from "@/lib/date-utils/constants";

export function formatDefaultDate(date: Date): string {
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatAriaDate(date: Date): string {
  return `${WEEKDAYS_FULL[date.getDay()]}, ${MONTH_NAMES_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
