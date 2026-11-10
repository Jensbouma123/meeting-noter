import { generateTheme, type GeneratedTheme, type UnresolvableRole } from "../lib/color/theme.js";
import type { HarmonyMode } from "../lib/color/types.js";
import type { ParsedThemeOptions, ThemeFormat } from "./parse.js";
export type ThemeGenerator = typeof generateTheme;
export interface ThemeCommandResult {
    readonly exitCode: 0 | 1;
    readonly stdout: string;
    readonly stderr: string;
}
export interface JsonThemeReport {
    readonly seed: string;
    readonly harmony: HarmonyMode;
    readonly passesAA: boolean;
    readonly unresolvable: readonly UnresolvableRole[];
    readonly failures: readonly unknown[];
    readonly css?: string;
    readonly tailwind?: string;
    readonly dtcg?: string;
}
export declare function selectFormatOutput(theme: GeneratedTheme, format: ThemeFormat): string;
export declare function buildJsonReport(theme: GeneratedTheme, format: ThemeFormat): JsonThemeReport;
export declare function formatUnresolvableLine(entry: UnresolvableRole): string;
export declare function buildFailureStderr(theme: GeneratedTheme): string;
export declare function runThemeCommand(options: ParsedThemeOptions, generate?: ThemeGenerator): ThemeCommandResult;
