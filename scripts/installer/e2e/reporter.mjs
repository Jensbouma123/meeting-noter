let failures = 0;

export function check(ok, what, info = '') {
  const detail = ok || !info ? '' : `\n      ${String(info).replace(/\n/g, '\n      ')}`;
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}${detail}`);
  if (!ok) failures++;
}

export const failureCount = () => failures;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
