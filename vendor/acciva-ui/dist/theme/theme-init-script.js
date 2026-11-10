import { jsx as _jsx } from "react/jsx-runtime";
import { THEME_STORAGE_KEY } from "../lib/theme-storage-key.js";
// Runs synchronously while the HTML is still parsing, before first paint, so
// a returning visitor's stored/system theme is applied with no flash. Mirrors
// the resolution order of theme-context.tsx's readStoredTheme()/prefersDarkMode().
export const themeInitScript = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var mode=null;if(raw){var parsed=JSON.parse(raw);if(parsed&&(parsed.mode==="light"||parsed.mode==="dark"))mode=parsed.mode;}if(!mode){mode=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",mode);}catch(e){}})();`;
/**
 * Render inside `<head>`, above everything else. The host `<html>` needs
 * `suppressHydrationWarning` because this script rewrites `data-theme` before
 * React hydrates, so the server and client markup provably differ.
 */
export function ThemeInitScript() {
    // next/script beforeInteractive is deliberately NOT used here - it defers the body into the __next_s queue, which drains after first paint and reintroduces the theme flash. React's 'script tag while rendering' warning is expected and accepted: this script is SSR-only by design and must not re-run on client navigation.
    return _jsx("script", { dangerouslySetInnerHTML: { __html: themeInitScript } });
}
