import { createHash } from 'node:crypto';
import { EXPORT_TYPE, LIMITS, MIGRATABLE_KEYS, MIGRATABLE_PATTERNS, PROTOCOL_VERSION, REQUEST_TYPE } from './constants';
import { appOrigins } from './origins';

function exportScript(appPort: number): string {
  const config = JSON.stringify({
    app: appOrigins(appPort),
    keys: MIGRATABLE_KEYS,
    patterns: MIGRATABLE_PATTERNS,
    limits: LIMITS,
    request: REQUEST_TYPE,
    reply: EXPORT_TYPE,
    version: PROTOCOL_VERSION,
  });
  return `(() => {
const c = ${config};
const patterns = c.patterns.map((p) => new RegExp(p));
const allowed = (k) => k.length <= c.limits.maxKeyChars && (c.keys.includes(k) || patterns.some((p) => p.test(k)));
addEventListener('message', (e) => {
  if (!c.app.includes(e.origin) || !e.source || !e.data || e.data.type !== c.request) return;
  const entries = [];
  let total = 0;
  for (let i = 0; i < localStorage.length && entries.length < c.limits.maxEntries; i++) {
    const k = localStorage.key(i);
    if (!k || !allowed(k)) continue;
    const v = localStorage.getItem(k);
    if (v === null || v.length > c.limits.maxValueChars || total + v.length > c.limits.maxTotalChars) continue;
    total += v.length;
    entries.push([k, v]);
  }
  e.source.postMessage({ type: c.reply, version: c.version, entries }, e.origin);
});
})();`;
}

export function exportPage(appPort: number): { html: string; csp: string } {
  const script = exportScript(appPort);
  const hash = createHash('sha256').update(script).digest('base64');
  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${hash}'`,
    `frame-ancestors ${appOrigins(appPort).join(' ')}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  const html = `<!doctype html><meta charset="utf-8"><title>Meeting Noter</title><script>${script}</script>`;
  return { html, csp };
}
