import type { ParsedAddOptions, ParsedListOptions } from "../parse/index.js";
import type { CommandResult } from "./types.js";
export declare function runAddCommand(options: ParsedAddOptions, registryDir: string, cwd: string): CommandResult;
export declare function runListCommand(options: ParsedListOptions, registryDir: string): CommandResult;
