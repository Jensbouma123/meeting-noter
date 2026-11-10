import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

// PAGES=1 -> static export for GitHub Pages (project site under /meeting-noter).
// Without it nothing here changes: local build/start and the launcher are as before.
const pages = process.env.PAGES === "1";
const basePath = pages ? "/meeting-noter" : "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_HOSTED: pages ? "1" : "",
  },
  ...(pages ? { output: "export", basePath, assetPrefix: basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  turbopack: {
    resolveAlias: {
      "@jensbouma123/acciva-ui": "./vendor/acciva-ui",
      "@jensbouma123/acciva-ui/theme": "./vendor/acciva-ui/dist/theme/index.js",
      "@jensbouma123/acciva-ui/styles": "./vendor/acciva-ui/dist/styles/tokens.css",
    },
  },
};

export default nextConfig;
