import type { ParsedCommand } from "./types.js";
/** Top-level dispatch: `theme` keeps its own parser and messages unchanged. */
export declare function parseArgs(argv: readonly string[]): ParsedCommand;
