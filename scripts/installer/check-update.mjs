import { existsSync, readFileSync } from "node:fs";

const here = new URL("./version.mjs", import.meta.url);
const { compareVersions, installerAssetsReady, RELEASES_API } = await import(
  existsSync(here) ? here.href : new URL("../../src/lib/update/version.mjs", import.meta.url).href
);

export function installableUpdate(release, current, arch) {
  if (compareVersions(release?.tag_name, current) !== 1) return null;
  if (!installerAssetsReady((release.assets ?? []).map((a) => a?.name), arch)) return null;
  return String(release.tag_name).replace(/^v/, "");
}

async function printInstallableUpdate() {
  try {
    const dir = new URL("../", import.meta.url);
    const current = readFileSync(new URL("VERSION", dir), "utf8").trim();
    const arch = readFileSync(new URL("ARCH", dir), "utf8").trim();
    const res = await fetch(process.env.MEETING_NOTER_RELEASES_URL || RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
    });
    const v = res.ok ? installableUpdate(await res.json(), current, arch) : null;
    if (v) console.log(v);
  } catch {
    return;
  }
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) await printInstallableUpdate();
