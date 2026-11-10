export declare const themeInitScript: string;
/**
 * Render inside `<head>`, above everything else. The host `<html>` needs
 * `suppressHydrationWarning` because this script rewrites `data-theme` before
 * React hydrates, so the server and client markup provably differ.
 */
export declare function ThemeInitScript(): import("react").JSX.Element;
