import type { DtcgToken } from "../../tokens/index.js";
import type { Hex, OKLCH } from "../../types.js";
/** Per-mode `--css-variable-name` -> hex replacements applied at export time. */
export type ModeTokenOverrides = {
    readonly light: Readonly<Record<string, Hex>>;
    readonly dark: Readonly<Record<string, Hex>>;
};
export type FlatToken = {
    readonly path: readonly string[];
    readonly variable: string;
    readonly token: DtcgToken;
    readonly color: OKLCH;
    readonly hex: string;
    readonly literal: string;
};
export type FlattenedDocument = {
    readonly primitive: readonly FlatToken[];
    readonly light: readonly FlatToken[];
    readonly dark: readonly FlatToken[];
};
