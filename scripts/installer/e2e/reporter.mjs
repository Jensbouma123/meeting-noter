let failures = 0;

export function check(ok, what, info = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}${ok || !info ? '' : `\n      ${String(info).replace(/\n/g, '\n      ')}`}`);
  if (!ok) failures++;
}

export const failureCount = () => failures;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
