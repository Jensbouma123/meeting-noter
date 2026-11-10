import { evaluatePair } from "../color/index.js";
import { PAIR_SPECS } from "./contrast-pair-specs.js";
import { ROLE_THRESHOLDS, } from "./contrast-thresholds.js";
import { ROLE_VARIABLES } from "./roles.js";
export function pairFromSpec(spec, theme) {
    const [foreground, background] = spec.pick(theme);
    const thresholds = ROLE_THRESHOLDS[spec.category];
    const baseReport = evaluatePair(foreground, background, spec.use);
    const ratio = baseReport.wcag.ratio;
    const lc = baseReport.apca.lc;
    // The ratio is the gate. APCA is carried alongside it as a quality signal and
    // is deliberately absent from `passes`: it may not rescue a short ratio, and
    // no category may waive the ratio to reach a pass.
    const wcagPasses = ratio >= thresholds.aa.ratio;
    const apcaPasses = Math.abs(lc) >= thresholds.aa.lc;
    const report = {
        ...baseReport,
        wcag: {
            ...baseReport.wcag,
            required: thresholds.aa.ratio,
            passes: wcagPasses,
        },
        apca: {
            ...baseReport.apca,
            required: thresholds.aa.lc,
            passes: apcaPasses,
        },
        passes: wcagPasses,
    };
    return {
        id: spec.id,
        label: spec.label,
        mode: theme.mode,
        use: spec.use,
        category: spec.category,
        adjustableTarget: spec.adjustableTarget,
        thresholds,
        cssVariable: ROLE_VARIABLES[spec.id],
        verdict: thresholds.criterion === null ? "exempt" : wcagPasses ? "pass" : "fail",
        foreground,
        background,
        report,
    };
}
export function themeContrastPairs(theme) {
    return PAIR_SPECS.map((spec) => pairFromSpec(spec, theme));
}
