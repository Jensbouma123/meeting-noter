import { type DtcgDocument, type DtcgToken } from "../tokens.js";
import type { Hex, OKLCH } from "../types.js";
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
export declare function isAlias(value: string): boolean;
export declare function aliasPath(value: string): string[];
export declare function parseOklchLiteral(value: string): OKLCH;
/** Follows an alias chain such as `{color.primitive.brand.500}` to its literal. */
export declare function resolveLiteral(doc: DtcgDocument, token: DtcgToken): string;
/**
 * `color.primitive.brand.500` -> `--color-brand-500`,
 * `color.semantic.dark.background.canvas` -> `--color-background-canvas`.
 * The layer and mode segments are dropped: a mode is expressed by the CSS
 * selector the declaration sits in, not by the property name.
 */
export declare function cssVariableName(path: readonly string[]): string;
export type FlattenedDocument = {
    readonly primitive: readonly FlatToken[];
    readonly light: readonly FlatToken[];
    readonly dark: readonly FlatToken[];
};
/**
 * Applies per-mode hex overrides to a flattened document, returning a new
 * document where every token whose CSS variable name appears in the overrides
 * map has its `hex` and `literal` replaced by the overridden value.
 *
 * Tokens whose variable name is not in the overrides map are copied verbatim.
 */
export declare function applyOverrides(doc: FlattenedDocument, overrides: ModeTokenOverrides): FlattenedDocument;
/** Flattens the graph into resolved, CSS-ready declarations grouped by mode. */
export declare function flattenDocument(doc: DtcgDocument): FlattenedDocument;
