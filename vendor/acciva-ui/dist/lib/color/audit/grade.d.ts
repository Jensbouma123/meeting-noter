import type { FlatToken } from "../export/resolve/index.js";
import type { Hex, OKLCH, ThemeMode } from "../types.js";
import type { PairResult, RequiredPair } from "./types.js";
/**
 * Grade one pair from explicit hexes. Exposed so a caller that already has
 * resolved colours — an override editor, a test — can reuse the exact gate the
 * theme audit applies, without rebuilding a token graph.
 *
 * `pass` is `ratio >= required` with no other term. There is no lightness
 * window, no polarity special case and no APCA clause that can turn a failing
 * ratio into a pass.
 */
export declare function gradePair(pair: RequiredPair, mode: ThemeMode, foreground: Hex, background: Hex): PairResult;
type RoleResolution = {
    readonly hex: Hex;
    readonly color: OKLCH;
};
export declare function roleIndex(tokens: readonly FlatToken[]): Map<string, RoleResolution>;
export declare function gradeMode(index: Map<string, RoleResolution>, mode: ThemeMode): PairResult[];
export {};
