import { type ParsedAddOptions } from "../parse/index.js";
import { type Registry } from "../registry/index.js";
import type { AddReport } from "./types.js";
export declare function planAndWrite(options: ParsedAddOptions, registry: Registry, registryDir: string, cwd: string): AddReport;
