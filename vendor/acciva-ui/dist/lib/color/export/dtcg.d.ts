import { type ModeTokenOverrides } from "./resolve.js";
import { type DtcgDocument } from "../tokens.js";
/** Serialises the graph as a W3C DTCG 2025.10 JSON document. */
export declare function exportDtcgJson(doc: DtcgDocument, overrides?: ModeTokenOverrides): string;
