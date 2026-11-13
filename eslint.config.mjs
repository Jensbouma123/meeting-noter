import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import localRules from "./scripts/eslint-rules/index.mjs";

const SOURCE_FILES = ["**/*.{ts,tsx,js,mjs}"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactYouMightNotNeedAnEffect.configs.recommended,
  {
    files: SOURCE_FILES,
    plugins: { local: localRules },
    rules: {
      "max-lines": ["error", { max: 150, skipBlankLines: false, skipComments: false }],
      "local/types-in-own-files": "error",
      "local/no-comments": "error",
      "local/one-unit-per-file": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
    "public/models/**",
    "**/*.generated.*",
    "**/generated/**",
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
