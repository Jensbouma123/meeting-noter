// Version comparison and "latest GitHub release" lookup. Plain ESM so both the
// app (banner) and scripts/update.mjs (launcher) share one implementation.

export const RELEASES_API = "https://api.github.com/repos/Jensbouma123/meeting-noter/releases/latest";

/** "v1.2.3" / "1.2.3-beta" -> [1,2,3], or null when it is not a version. */
export function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** 1 if a > b, -1 if a < b, 0 if equal; null when either is unparseable. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

/**
 * Newest release if it is newer than `current`, else null. Offline, timeouts,
 * rate limits and malformed answers all return null: updates are best-effort.
 * Only version metadata is requested; nothing about the user is sent.
 */
export async function findNewerRelease(current, { fetchFn = fetch, url = RELEASES_API, timeoutMs = 5000 } = {}) {
  try {
    const res = await fetchFn(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const rel = await res.json();
    if (compareVersions(rel?.tag_name, current) !== 1) return null;
    return {
      version: String(rel.tag_name).replace(/^v/, ""),
      tag: rel.tag_name,
      zipballUrl: rel.zipball_url ?? null,
      pageUrl: rel.html_url ?? null,
    };
  } catch {
    return null;
  }
}
