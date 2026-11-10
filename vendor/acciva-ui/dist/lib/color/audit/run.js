import { flattenDocument } from "../export/resolve/index.js";
import { buildTokenGraph } from "../tokens/index.js";
import { gradeMode, roleIndex } from "./grade.js";
/**
 * Grade an already-built token graph. Use this over {@link auditTheme} when the
 * caller holds a graph already — building one is ~14 ramps of work.
 */
export function auditTokenGraph(doc, seed = "") {
    const flat = flattenDocument(doc);
    const light = gradeMode(roleIndex(flat.light), "light");
    const dark = gradeMode(roleIndex(flat.dark), "dark");
    const failures = [...light, ...dark].filter((result) => !result.pass && !result.exempt);
    return { seed, light, dark, failures, passesAA: failures.length === 0 };
}
/**
 * Audit a seed colour's generated theme against WCAG 2.2 AA in both modes.
 * `passesAA` is true only when every non-exempt pair clears its ratio in light
 * *and* dark — a theme that conforms in one mode only does not pass.
 */
export function auditTheme(seed, opts = {}) {
    return auditTokenGraph(buildTokenGraph(seed, opts), seed);
}
