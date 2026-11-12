export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isSameYear(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear();
}

export function isBeforeDay(a: Date, b: Date): boolean {
  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return dateA < dateB;
}

export function isAfterDay(a: Date, b: Date): boolean {
  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return dateA > dateB;
}

export function isDateInRange(date: Date, start: Date | null | undefined, end: Date | null | undefined): boolean {
  if (!start || !end) return false;
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const minTime = Math.min(startTime, endTime);
  const maxTime = Math.max(startTime, endTime);
  return target >= minTime && target <= maxTime;
}
