export const RELEASES_API = "https://api.github.com/repos/Jensbouma123/meeting-noter/releases/latest";

export function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

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
      name: rel.name || String(rel.tag_name),
      notes: typeof rel.body === "string" && rel.body.trim() ? rel.body : null,
      publishedAt: rel.published_at ?? null,
      assetNames: Array.isArray(rel.assets) ? rel.assets.map((a) => a?.name).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

export function installerAssetsReady(assetNames, arch) {
  const want = `meeting-noter-macos-${arch}.tar.gz`;
  return assetNames.includes(want) && assetNames.includes(`${want}.sha256`);
}
