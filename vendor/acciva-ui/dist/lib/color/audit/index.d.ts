/**
 * Dual-mode WCAG 2.2 AA gate.
 *
 * A theme is only shippable when it clears AA in light **and** dark
 * simultaneously, so the audit grades one fixed table of role pairs against
 * both mode's resolved values and returns a single verdict.
 *
 * **The gate is the WCAG 2.2 contrast ratio and nothing else.** `pass` is
 * exactly `ratio >= required` (4.5 for body text, 3.0 for large text, UI
 * components, graphical objects and focus indicators). APCA `Lc` is reported
 * alongside every pair as advisory information — it is a WCAG 3 draft metric on
 * a perceptual scale, it is not a conformance requirement, and it must never
 * decide `pass`, `failures` or `passesAA`. This is why the audit does not use
 * `evaluatePair` from `contrast.ts` or `adjustForContrast` from `solve.ts`:
 * both AND the two engines together, which would fail a pair that conforms to
 * WCAG 2.2 AA.
 *
 * Values are read back through the emitted token graph rather than from
 * `buildSemanticRoles` directly, so the audit grades the colours that actually
 * ship — including the alias indirection and the `precision` rounding applied
 * on the way out.
 */
export type { AaUse, AuditOptions, GateUse, PairResult, RequiredPair, RolePath, ThemeAudit, } from "./types.js";
export { REQUIRED_PAIRS } from "./pairs.js";
export { gradePair } from "./grade.js";
export { auditTheme, auditTokenGraph } from "./run.js";
