import { flattenDocument } from "@/lib/color/export/resolve/index";
import { buildTokenGraph, type DtcgDocument } from "@/lib/color/tokens/index";
import type { Hex } from "@/lib/color/types";
import { gradeMode, roleIndex } from "@/lib/color/audit/grade";
import type { AuditOptions, ThemeAudit } from "@/lib/color/audit/types";

/**
 * Grade an already-built token graph. Use this over {@link auditTheme} when the
 * caller holds a graph already — building one is ~14 ramps of work.
 */
export function auditTokenGraph(doc: DtcgDocument, seed: Hex = ""): ThemeAudit {
  const flat = flattenDocument(doc);
  const light = gradeMode(roleIndex(flat.light), "light");
  const dark = gradeMode(roleIndex(flat.dark), "dark");
  const failures = [...light, ...dark].filter(
    (result) => !result.pass && !result.exempt,
  );

  return { seed, light, dark, failures, passesAA: failures.length === 0 };
}

/**
 * Audit a seed colour's generated theme against WCAG 2.2 AA in both modes.
 * `passesAA` is true only when every non-exempt pair clears its ratio in light
 * *and* dark — a theme that conforms in one mode only does not pass.
 */
export function auditTheme(seed: Hex, opts: AuditOptions = {}): ThemeAudit {
  return auditTokenGraph(buildTokenGraph(seed, opts), seed);
}
