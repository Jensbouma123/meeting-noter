import type { SwatchOption, ResolvedOption } from "./types.js";
export declare function resolveOptions(options: readonly (string | SwatchOption)[]): ResolvedOption[];
export declare function selectionHex(value: string | null | undefined): string | null;
