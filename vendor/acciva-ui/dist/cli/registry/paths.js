import { posix } from "node:path";
export const DEFAULT_TARGET = "src/components/acciva";
const SAFE_PATH = /^(?:[\w-]+\/)*[\w.-]+\.(?:tsx?|css)$/;
const CANONICAL_SPECIFIER = /(['"])@\/([^'"\s]+)\1/g;
/** A registry path is a plain relative path: no `..`, no absolute, no odd characters. */
export function isSafeRegistryPath(path) {
    return SAFE_PATH.test(path) && !path.split("/").some((segment) => segment === "." || segment === "..");
}
export function stripExtension(path) {
    return /\.tsx?$/.test(path) ? path.replace(/\.tsx?$/, "") : path;
}
/** Where a source path lands under the target dir: ui + blocks flat, everything else keeps its path (`lib/...`). */
export function targetPathFor(sourcePath) {
    return sourcePath.replace(/^components\/(?:ui|blocks)\//, "");
}
function relativeSpecifier(fromTarget, toTarget) {
    const relative = posix.relative(posix.dirname(fromTarget), stripExtension(toTarget));
    return relative.startsWith(".") ? relative : `./${relative}`;
}
/** Rewrite every canonical `@/...` import in a vendored file to a path relative to its new home. */
export function rewriteImports(source, sourcePath, files) {
    const byCanonical = new Map();
    for (const path of Object.keys(files))
        byCanonical.set(stripExtension(path), path);
    const fromTarget = targetPathFor(sourcePath);
    return source.replace(CANONICAL_SPECIFIER, (match, quote, canonical) => {
        const dependency = byCanonical.get(canonical);
        if (dependency === undefined)
            return match;
        return `${quote}${relativeSpecifier(fromTarget, targetPathFor(dependency))}${quote}`;
    });
}
