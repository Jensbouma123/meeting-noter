export function ftsQuery(text: string): string | null {
  const words = text.match(/[\p{L}\p{N}_]+/gu);
  if (!words || words.length === 0) return null;
  return words.map((w) => `"${w}"*`).join(' ');
}
