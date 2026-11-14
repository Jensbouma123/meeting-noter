import type { DtcgDocument } from "@/lib/color/tokens/index";
import type { ModeTokenOverrides } from "@/lib/color/export/resolve/index";
import { hasEntries, withTokenOverrides } from "@/lib/color/export/doc-overrides";

/** Serialises the graph as a W3C DTCG 2025.10 JSON document. */
export function exportDtcgJson(doc: DtcgDocument, overrides?: ModeTokenOverrides): string {
  const serialisable = hasEntries(overrides) ? withTokenOverrides(doc, overrides) : doc;
  return `${JSON.stringify(serialisable, null, 2)}\n`;
}
