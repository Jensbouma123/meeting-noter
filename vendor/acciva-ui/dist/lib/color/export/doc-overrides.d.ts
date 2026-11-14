import { type FlatToken, type ModeTokenOverrides } from "./resolve/index.js";
import { type DtcgDocument } from "../tokens/index.js";
import type { Hex } from "../types.js";
/**
 * Applies the overrides to the graph before any alias is resolved, so component
 * tokens that alias an overridden semantic token pick up the override too.
 */
export declare function withTokenOverrides(doc: DtcgDocument, overrides: ModeTokenOverrides): DtcgDocument;
/**
 * Keeps the hex the caller typed as the fallback declaration. Round-tripping
 * through oklch would re-round it, so the flattened hex is pinned to the input.
 */
export declare function pinOverrideHex(tokens: readonly FlatToken[], overrides: Readonly<Record<string, Hex>>): readonly FlatToken[];
export declare function hasEntries(overrides: ModeTokenOverrides | undefined): overrides is ModeTokenOverrides;
