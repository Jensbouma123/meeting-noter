/** Packages whose barrels Next must rewrite to per-module imports so only used exports ship. */
const OPTIMIZED_PACKAGES = ["@jensbouma123/acciva-ui", "lucide-react"];
/**
 * Adds ACCIVA UI and `lucide-react` to `experimental.optimizePackageImports`,
 * keeping the host's own entries and every other config key untouched.
 */
export function withAcciva(config = {}) {
    const existing = config.experimental?.optimizePackageImports ?? [];
    return {
        ...config,
        experimental: {
            ...config.experimental,
            optimizePackageImports: [...new Set([...existing, ...OPTIMIZED_PACKAGES])],
        },
    };
}
