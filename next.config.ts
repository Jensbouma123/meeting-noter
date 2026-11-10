import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

// STANDALONE=1 -> self-contained server in .next/standalone for the Mac installer
// (scripts/installer/package.sh); the app itself is the same as the local build.
const standalone = process.env.STANDALONE === "1";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
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
