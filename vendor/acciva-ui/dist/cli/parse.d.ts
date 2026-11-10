import type { HarmonyMode } from "../lib/color/types.js";
export type ThemeFormat = "css" | "tailwind" | "dtcg";
export interface ParsedThemeOptions {
    readonly seed: string;
    readonly harmony: HarmonyMode;
    readonly format: ThemeFormat;
    readonly out: string | undefined;
    readonly json: boolean;
}
export declare const HARMONIES: readonly HarmonyMode[];
export declare const FORMATS: readonly ThemeFormat[];
export declare const DEFAULT_THEME_HARMONY: HarmonyMode;
export declare const DEFAULT_THEME_FORMAT: ThemeFormat;
export declare class CliError extends Error {
    readonly exitCode: 1;
}
export declare function usage(): string;
export declare function parseThemeArgs(argv: readonly string[]): ParsedThemeOptions;
