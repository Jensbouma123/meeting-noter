// Used by "Start Meeting Noter.command".
//   node scripts/update.mjs check   -> prints the newer version (and tag/zip) as "VERSION" or nothing
//   node scripts/update.mjs apply   -> updates the app files in place (git pull, else release zip)
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findNewerRelease, RELEASES_API } from "../src/lib/update/version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const current = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
// Overridable for tests only.
const url = process.env.MEETING_NOTER_RELEASES_URL || RELEASES_API;

const rel = await findNewerRelease(current, { url });
const cmd = process.argv[2];

if (cmd === "check") {
  if (rel) console.log(rel.version);
  process.exit(0);
}

if (cmd !== "apply") process.exit(2);
if (!rel) {
  console.log("Al up-to-date.");
  process.exit(0);
}

const run = (c, a, o = {}) => spawnSync(c, a, { cwd: root, stdio: "inherit", ...o });
const out = (c, a) => spawnSync(c, a, { cwd: root, encoding: "utf8" });

// 1) A clean git checkout just pulls.
if (existsSync(path.join(root, ".git"))) {
  const st = out("git", ["status", "--porcelain"]);
  if (st.status === 0 && st.stdout.trim() === "" && run("git", ["pull", "--ff-only"]).status === 0) {
    console.log(`Bijgewerkt naar ${rel.version} (git pull).`);
    process.exit(0);
  }
  console.log("Git-update niet mogelijk; ik gebruik de release-download.");
}

// 2) Otherwise replace the files from the release zip, keeping local state.
if (!rel.zipballUrl) { console.error("Release heeft geen download."); process.exit(1); }
const tmp = mkdtempSync(path.join(tmpdir(), "mn-update-"));
const zip = path.join(tmp, "release.zip");
if (run("curl", ["-fSL", "--progress-bar", "-o", zip, rel.zipballUrl]).status !== 0) process.exit(1);
if (run("unzip", ["-q", zip, "-d", path.join(tmp, "x")]).status !== 0) process.exit(1);
const top = readdirSync(path.join(tmp, "x"));
const src = top.length === 1 ? path.join(tmp, "x", top[0]) : path.join(tmp, "x");
if (!existsSync(path.join(src, "package.json"))) { console.error("Onverwachte zip-inhoud."); process.exit(1); }
const keep = [".runtime", ".runtime-server.pid", "node_modules", ".next", ".git"];
const r = run("rsync", ["-a", "--delete", ...keep.flatMap((k) => ["--exclude", `/${k}`]), src + "/", root + "/"]);
if (r.status !== 0) process.exit(1);
run("chmod", ["+x", "Start Meeting Noter.command", "Stop Meeting Noter.command"]);
console.log(`Bijgewerkt naar ${rel.version} (release-download).`);
