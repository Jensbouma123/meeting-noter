import { hasEntries, withTokenOverrides } from "./doc-overrides.js";
/** Serialises the graph as a W3C DTCG 2025.10 JSON document. */
export function exportDtcgJson(doc, overrides) {
    const serialisable = hasEntries(overrides) ? withTokenOverrides(doc, overrides) : doc;
    return `${JSON.stringify(serialisable, null, 2)}\n`;
}
