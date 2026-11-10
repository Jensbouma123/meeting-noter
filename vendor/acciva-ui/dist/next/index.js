/** Packages whose barrels Next must rewrite to per-module imports so only used exports ship. */
const OPTIMIZED_PACKAGES = ["@jensbouma123/acciva-ui", "lucide-react"];
/**
 * Adds ACCIVA UI and `lucide-react` to `experimental.optimizePackageImports`,
 * keeping the host's own entries and every other config key untouched.
 */
export function withAcciva(config = {}) {
    var _a, _b;
    const existing = (_b = (_a = config.experimental) === null || _a === void 0 ? void 0 : _a.optimizePackageImports) !== null && _b !== void 0 ? _b : [];
    return Object.assign(Object.assign({}, config), { experimental: Object.assign(Object.assign({}, config.experimental), { optimizePackageImports: [...new Set([...existing, ...OPTIMIZED_PACKAGES])] }) });
}
