import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findNewerRelease, RELEASES_API } from "../src/lib/update/version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const current = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
const url = process.env.MEETING_NOTER_RELEASES_URL || RELEASES_API;

const newerRelease = await findNewerRelease(current, { url });
const cmd = process.argv[2];

if (cmd === "check") {
  if (newerRelease) console.log(newerRelease.version);
  process.exit(0);
}

if (cmd !== "apply") process.exit(2);
if (!newerRelease) {
  console.log("Al up-to-date.");
  process.exit(0);
}

const runInRoot = (c, a, o = {}) => spawnSync(c, a, { cwd: root, stdio: "inherit", ...o });
const captureInRoot = (c, a) => spawnSync(c, a, { cwd: root, encoding: "utf8" });

if (existsSync(path.join(root, ".git"))) {
  const st = captureInRoot("git", ["status", "--porcelain"]);
  if (st.status === 0 && st.stdout.trim() === "" && runInRoot("git", ["pull", "--ff-only"]).status === 0) {
    console.log(`Bijgewerkt naar ${newerRelease.version} (git pull).`);
    process.exit(0);
  }
  console.log("Git-update niet mogelijk; ik gebruik de release-download.");
}

if (!newerRelease.zipballUrl) { console.error("Release heeft geen download."); process.exit(1); }
const tmp = mkdtempSync(path.join(tmpdir(), "mn-update-"));
const zip = path.join(tmp, "release.zip");
if (runInRoot("curl", ["-fSL", "--progress-bar", "-o", zip, newerRelease.zipballUrl]).status !== 0) process.exit(1);
if (runInRoot("unzip", ["-q", zip, "-d", path.join(tmp, "x")]).status !== 0) process.exit(1);
const top = readdirSync(path.join(tmp, "x"));
const src = top.length === 1 ? path.join(tmp, "x", top[0]) : path.join(tmp, "x");
if (!existsSync(path.join(src, "package.json"))) { console.error("Onverwachte zip-inhoud."); process.exit(1); }
const keep = [".runtime", ".runtime-server.pid", "node_modules", ".next", ".git"];
const rsyncResult = runInRoot("rsync", ["-a", "--delete", ...keep.flatMap((k) => ["--exclude", `/${k}`]), src + "/", root + "/"]);
if (rsyncResult.status !== 0) process.exit(1);
runInRoot("chmod", ["+x", "Start Meeting Noter.command", "Stop Meeting Noter.command"]);
console.log(`Bijgewerkt naar ${newerRelease.version} (release-download).`);
