export const fillTemplate = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
