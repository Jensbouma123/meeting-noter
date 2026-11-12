const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Base-1024 byte size: "512 B", "1.5 KB", "5 MB". */
export function formatBytes(bytes: number, locale?: string): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 1 : 0 }).format(value);
  return `${n} ${UNITS[unit]}`;
}
