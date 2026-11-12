/**
 * Dual contrast engines: WCAG 2.1 relative-luminance ratio and APCA (WCAG 3
 * draft) signed lightness contrast. A semantic pair passes only when BOTH
 * gates pass — see {@link evaluatePair}.
 *
 * WCAG 2.1 gamma expansion, luminance weights and the ratio formula follow
 * `.agents`-level spec section 5 (WCAG 2.1 SC 1.4.3 / 1.4.6 / 1.4.11).
 *
 * APCA constants are the SA98G G-series set for APCA-W3 0.1.9, transcribed
 * from https://github.com/Myndex/apca-w3 (`src/apca-w3.js`, the `SA98G`
 * object and `sRGBtoY` / `APCAcontrast`). Do not "simplify" or re-derive
 * them: every published Lc value depends on these exact numbers.
 */

export * from "@/lib/color/contrast/wcag";
export * from "@/lib/color/contrast/apca";
export * from "@/lib/color/contrast/thresholds";
export * from "@/lib/color/contrast/evaluate";
