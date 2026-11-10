import type { NextConfig } from "next";
/**
 * Adds ACCIVA UI and `lucide-react` to `experimental.optimizePackageImports`,
 * keeping the host's own entries and every other config key untouched.
 */
export declare function withAcciva(config?: NextConfig): NextConfig;
