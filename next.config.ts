import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@jensbouma123/acciva-ui": "./vendor/acciva-ui",
      "@jensbouma123/acciva-ui/theme": "./vendor/acciva-ui/dist/theme/index.js",
      "@jensbouma123/acciva-ui/styles": "./vendor/acciva-ui/dist/styles/tokens.css",
    },
  },
};

export default nextConfig;
