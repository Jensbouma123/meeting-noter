export const SNIPPET_MAX_CHARS = 160;

export function makeSnippet(text: string, query: string, max = SNIPPET_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const lower = flat.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  let at = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (at === -1 || idx < at)) at = idx;
  }
  if (at === -1) return `${flat.slice(0, max).trimEnd()}…`;
  const from = Math.max(0, at - Math.floor(max / 3));
  const body = flat.slice(from, from + max).trim();
  return `${from > 0 ? '…' : ''}${body}${from + max < flat.length ? '…' : ''}`;
}
