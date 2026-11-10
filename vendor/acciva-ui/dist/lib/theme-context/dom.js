import { DEFAULT_RADIUS, RADIUS_BASE_VARIABLE, RADIUS_MAP, } from "../theme-tokens/index.js";
// An inline style holds one value per property, so it cannot carry the
// hex-then-oklch fallback pair the generated stylesheet uses. The engine is
// asked once whether the browser understands CSS Color 4 and every property is
// written in the form that engine can read.
let oklchSupport = null;
function supportsOklch() {
    if (oklchSupport !== null)
        return oklchSupport;
    oklchSupport =
        typeof CSS !== "undefined" &&
            typeof CSS.supports === "function" &&
            CSS.supports("color", "oklch(0.5 0.1 200)");
    return oklchSupport;
}
// The names this module has set inline on <html>. Returning to the default
// theme removes exactly these, so inline properties other code owns (the
// `--font-acciva-custom` alias fonts.ts writes) stay in place.
const writtenProperties = new Set();
function setRootProperty(root, name, value) {
    root.style.setProperty(name, value);
    writtenProperties.add(name);
}
export function applyTokensToDom(theme, radius = DEFAULT_RADIUS, tokenOverrides = { light: {}, dark: {} }) {
    const root = document.documentElement;
    const activeOverrides = "light" in tokenOverrides || "dark" in tokenOverrides
        ? tokenOverrides[theme.mode] ?? {}
        : tokenOverrides;
    const useOklch = supportsOklch();
    setRootProperty(root, RADIUS_BASE_VARIABLE, RADIUS_MAP[radius].rem);
    for (const entry of theme.variables) {
        setRootProperty(root, entry.name, useOklch ? entry.literal : entry.hex);
    }
    for (const [key, value] of Object.entries(activeOverrides)) {
        setRootProperty(root, key, value);
    }
    root.setAttribute("data-theme", theme.mode);
}
// The stylesheet already declares this seed and harmony for both modes, so the
// token properties stay as shipped: only the mode attribute, the radius and the
// per-mode overrides (keyed by CSS property name, so no palette is needed) are
// written. Anything an earlier non-matching theme wrote inline is removed first.
export function applyStylesheetThemeToDom(mode, radius, tokenOverrides) {
    const root = document.documentElement;
    for (const name of writtenProperties)
        root.style.removeProperty(name);
    writtenProperties.clear();
    if (radius !== DEFAULT_RADIUS)
        setRootProperty(root, RADIUS_BASE_VARIABLE, RADIUS_MAP[radius].rem);
    for (const [key, value] of Object.entries(tokenOverrides[mode] ?? {})) {
        setRootProperty(root, key, value);
    }
    root.setAttribute("data-theme", mode);
}
