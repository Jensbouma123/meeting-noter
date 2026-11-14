import type { DtcgDocument } from "../tokens/index.js";
import type { ModeTokenOverrides } from "./resolve/index.js";
/** Serialises the graph as a W3C DTCG 2025.10 JSON document. */
export declare function exportDtcgJson(doc: DtcgDocument, overrides?: ModeTokenOverrides): string;
