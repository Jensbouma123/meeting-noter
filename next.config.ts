import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

// PAGES=1 -> static export for GitHub Pages (project site under /meeting-noter).
// Without it nothing here changes: local build/start and the launcher are as before.
const pages = process.env.PAGES === "1";
const basePath = pages ? "/meeting-noter" : "";
// STANDALONE=1 -> self-contained server in .next/standalone for the Mac installer
// (scripts/installer/package.sh); the app itself is the same as the local build.
const standalone = process.env.STANDALONE === "1" && !pages;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_HOSTED: pages ? "1" : "",
  },
  ...(pages ? { output: "export", basePath, assetPrefix: basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(standalone ? { output: "standalone" } : {}),
  turbopack: {
    resolveAlias: {
      "@jensbouma123/acciva-ui": "./vendor/acciva-ui",
      "@jensbouma123/acciva-ui/theme": "./vendor/acciva-ui/dist/theme/index.js",
      "@jensbouma123/acciva-ui/styles": "./vendor/acciva-ui/dist/styles/tokens.css",
    },
  },
};

export default nextConfig;
