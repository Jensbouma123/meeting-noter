import { type ReactNode } from "react";
import type { HarmonyMode } from "../color/index.js";
import { type AppPalette } from "../theme-tokens/index.js";
export declare function ThemeProvider({ children, palette: serverPalette, stylesheet, }: {
    children: ReactNode;
    /** A palette built ahead of time (e.g. `buildAppPalette` in a Server Component); used while its seed and harmony are the active ones. */
    palette?: AppPalette;
    /**
     * The seed and harmony the page's stylesheet already declares (default: the shipped theme).
     * While they are the active ones the provider trusts the CSS variables and never runs the solver.
     */
    stylesheet?: {
        seed: string;
        harmony?: HarmonyMode;
    };
}): import("react").JSX.Element;
