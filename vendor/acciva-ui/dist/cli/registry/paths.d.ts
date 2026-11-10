import type { RegistryFile } from "./types.js";
export declare const DEFAULT_TARGET = "src/components/acciva";
/** A registry path is a plain relative path: no `..`, no absolute, no odd characters. */
export declare function isSafeRegistryPath(path: string): boolean;
export declare function stripExtension(path: string): string;
/** Where a source path lands under the target dir: ui + blocks flat, everything else keeps its path (`lib/...`). */
export declare function targetPathFor(sourcePath: string): string;
/** Rewrite every canonical `@/...` import in a vendored file to a path relative to its new home. */
export declare function rewriteImports(source: string, sourcePath: string, files: Readonly<Record<string, RegistryFile>>): string;
