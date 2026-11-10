import { type Hex } from "../color/index.js";
export type SeedSuggestion = {
    readonly seed: Hex;
    readonly deltaE: number;
    readonly description: string;
};
/**
 * The nearest seed on the same hue and chroma line that can serve as the action
 * fill at its own lightness, so the alias solver never has to darken `500` away
 * from the colour the user picked. Only lightness moves, for the same reason
 * the engine's own solver only moves lightness: hue and chroma are the brand.
 */
export declare function suggestSeed(seed: Hex): SeedSuggestion | null;
