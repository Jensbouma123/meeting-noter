import type { FlattenedDocument, ModeTokenOverrides } from "./types.js";
/**
 * Applies per-mode hex overrides to a flattened document, returning a new
 * document where every token whose CSS variable name appears in the overrides
 * map has its `hex` and `literal` replaced by the overridden value.
 *
 * Tokens whose variable name is not in the overrides map are copied verbatim.
 */
export declare function applyOverrides(doc: FlattenedDocument, overrides: ModeTokenOverrides): FlattenedDocument;
