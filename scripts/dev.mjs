import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helperDir = path.join(root, "helper");
const helperBin = path.join(helperDir, "build", "meeting-noter-audio-helper");
const HELPER_PORT = 47853;
const prod = process.argv[2] === "--prod";
const nextArgs = process.argv.slice(prod ? 3 : 2);
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const mcpBundle = path.join(root, "build", "mcp", "meetings-mcp.mjs");
if (!existsSync(mcpBundle)) {
  console.log("[mcp] building MCP bundle…");
  const r = spawnSync(process.execPath, [path.join(root, "node_modules", "rolldown", "bin", "cli.mjs"), "-c", "scripts/mcp/rolldown.config.mjs"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) console.warn("[mcp] build failed; assistants cannot connect until it succeeds");
}

if (prod && !existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.log("[next] no production build found; running next build…");
  const r = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function helperStale() {
  if (!existsSync(helperBin)) return true;
  const built = statSync(helperBin).mtimeMs;
  const dir = path.join(helperDir, "Sources");
  return readdirSync(dir, { recursive: true }).some(
    (f) => statSync(path.join(dir, f)).mtimeMs > built,
  );
}

function portListening(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("error", () => resolve(false));
  });
}

const children = [];
let stopping = false;

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  setTimeout(() => {
    for (const c of children) if (c.exitCode === null) c.kill("SIGKILL");
    process.exit(code);
  }, 3000).unref();
  if (children.every((c) => c.exitCode !== null)) process.exit(code);
}

function run(tag, cmd, args) {
  const child = spawn(cmd, args, { cwd: root, stdio: ["inherit", "pipe", "pipe"] });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (l) => console.log(`[${tag}] ${l}`));
  }
  child.on("exit", (code, signal) => {
    if (!stopping) console.log(`[${tag}] exited (${signal ?? code}); stopping`);
    if (children.every((c) => c.exitCode !== null || c.signalCode !== null)) process.exit(code ?? 0);
    stopAll(code ?? 0);
  });
  return child;
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => stopAll(0));

if (process.platform === "darwin" && !process.env.MEETING_NOTER_NO_HELPER) {
  if (await portListening(HELPER_PORT)) {
    console.log(`[helper] already listening on ${HELPER_PORT}; not starting another`);
  } else {
    let ready = true;
    if (helperStale()) {
      console.log("[helper] building…");
      const r = spawnSync("sh", ["helper/build.sh"], { cwd: root, stdio: "inherit" });
      if (r.status !== 0) {
        ready = false;
        console.warn("[helper] build failed; starting next dev without the helper");
      }
    }
    if (ready && existsSync(helperBin)) run("helper", helperBin, []);
  }
}

run("next", process.execPath, [nextBin, prod ? "start" : "dev", ...nextArgs]);
