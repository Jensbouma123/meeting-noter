const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];

function under1000(n: number): string[] {
  const out: string[] = [];
  if (n >= 100) out.push(ONES[Math.floor(n / 100)], 'hundred');
  const r = n % 100;
  if (r === 0) return out.length ? out : ['zero'];
  if (r < 20) out.push(ONES[r]);
  else out.push(TENS[Math.floor(r / 10)], ...(r % 10 ? [ONES[r % 10]] : []));
  return out;
}

export function intWords(n: number): string[] {
  if (!Number.isSafeInteger(n) || n >= 1e12) return [...String(n)].map((d) => ONES[Number(d)]);
  if (n < 1000) return under1000(n);
  const out: string[] = [];
  let rest = n;
  for (const [size, name] of SCALES) {
    if (rest >= size) { out.push(...under1000(Math.floor(rest / size)), name); rest %= size; }
  }
  if (rest) out.push(...under1000(rest));
  return out;
}

export function numberWords(token: string): string[] {
  const [int, frac] = token.replace(/,/g, '').split('.');
  const words = intWords(Number(int));
  return frac ? [...words, 'point', ...[...frac].map((d) => ONES[Number(d)])] : words;
}
