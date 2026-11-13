import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactYouMightNotNeedAnEffect.configs.recommended,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
