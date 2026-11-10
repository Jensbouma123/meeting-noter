import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
  turbopack: {
    resolveAlias: {
      "@jensbouma123/acciva-ui": "./vendor/acciva-ui",
      "@jensbouma123/acciva-ui/theme": "./vendor/acciva-ui/dist/theme/index.js",
      "@jensbouma123/acciva-ui/styles": "./vendor/acciva-ui/dist/styles/tokens.css",
    },
  },
};

export default nextConfig;
