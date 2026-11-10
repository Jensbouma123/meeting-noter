// Run by launcher.sh from the installed app: prints the newer version when the
// latest GitHub release is newer than this install AND already carries the
// tarball for this Mac (the release workflow uploads it minutes after
// publishing), else prints nothing. Offline and errors print nothing too.
import { existsSync, readFileSync } from "node:fs";

// In the release tarball version.mjs sits next to this file; in the repo it is
// the app's own copy.
const here = new URL("./version.mjs", import.meta.url);
const { compareVersions, RELEASES_API } = await import(
  existsSync(here) ? here.href : new URL("../../src/lib/update/version.mjs", import.meta.url).href
);

/** The release's version if it is newer than `current` and has the `arch` tarball, else null. */
export function installableUpdate(release, current, arch) {
  if (compareVersions(release?.tag_name, current) !== 1) return null;
  const want = `meeting-noter-macos-${arch}.tar.gz`;
  const names = (release.assets ?? []).map((a) => a?.name);
  if (!names.includes(want) || !names.includes(`${want}.sha256`)) return null;
  return String(release.tag_name).replace(/^v/, "");
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
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
    // best effort
  }
}
