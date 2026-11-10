import type { HarmonyMode } from "../../lib/color/types.js";
export type ThemeFormat = "css" | "tailwind" | "dtcg";
export interface ParsedThemeOptions {
    readonly seed: string;
    readonly harmony: HarmonyMode;
    readonly format: ThemeFormat;
    readonly out: string | undefined;
    readonly json: boolean;
}
export interface ParsedListOptions {
    readonly json: boolean;
}
export interface ParsedAddOptions {
    readonly names: readonly string[];
    readonly path: string | undefined;
    readonly overwrite: boolean;
    readonly dryRun: boolean;
    readonly json: boolean;
}
export type ParsedCommand = {
    readonly command: "help";
} | {
    readonly command: "theme";
    readonly options: ParsedThemeOptions;
} | {
    readonly command: "list";
    readonly options: ParsedListOptions;
} | {
    readonly command: "add";
    readonly options: ParsedAddOptions;
};
