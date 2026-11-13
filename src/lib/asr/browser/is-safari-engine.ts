export function isSafariEngine(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vendor = (navigator as Navigator & { vendor?: string }).vendor ?? '';
  const ua = navigator.userAgent ?? '';
  return /apple/i.test(vendor) && !/chrome|chromium|crios|fxios|edg/i.test(ua);
}
