import { type DtcgDocument } from "../tokens/index.js";
import type { Hex } from "../types.js";
import type { AuditOptions, ThemeAudit } from "./types.js";
/**
 * Grade an already-built token graph. Use this over {@link auditTheme} when the
 * caller holds a graph already — building one is ~14 ramps of work.
 */
export declare function auditTokenGraph(doc: DtcgDocument, seed?: Hex): ThemeAudit;
/**
 * Audit a seed colour's generated theme against WCAG 2.2 AA in both modes.
 * `passesAA` is true only when every non-exempt pair clears its ratio in light
 * *and* dark — a theme that conforms in one mode only does not pass.
 */
export declare function auditTheme(seed: Hex, opts?: AuditOptions): ThemeAudit;
