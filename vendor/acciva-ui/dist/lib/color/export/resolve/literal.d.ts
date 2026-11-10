import { type DtcgDocument, type DtcgToken } from "../../tokens/index.js";
import type { OKLCH } from "../../types.js";
export declare function isAlias(value: string): boolean;
export declare function aliasPath(value: string): string[];
export declare function parseOklchLiteral(value: string): OKLCH;
/** Follows an alias chain such as `{color.primitive.brand.500}` to its literal. */
export declare function resolveLiteral(doc: DtcgDocument, token: DtcgToken): string;
