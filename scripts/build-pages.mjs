// Static export for GitHub Pages: `PAGES=1 next build` -> out/.
// Server-only dev routes (src/app/api, src/app/dev) cannot be exported, so they
// are moved aside for the build and always restored.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";

const ASIDE = ".pages-aside"; // outside src/app, or Next still scans it

const aside = ["src/app/api", "src/app/dev"];
const moved = [];
try {
  for (const d of aside) {
    if (existsSync(d)) {
      mkdirSync(`${ASIDE}/${d.replace(/\//g, "_")}`.replace(/\/[^/]*$/, ""), { recursive: true });
      renameSync(d, `${ASIDE}/${d.replace(/\//g, "_")}`);
      moved.push(d);
    }
  }
  const r = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, PAGES: "1" },
  });
  process.exitCode = r.status ?? 1;
} finally {
  for (const d of moved) renameSync(`${ASIDE}/${d.replace(/\//g, "_")}`, d);
}
