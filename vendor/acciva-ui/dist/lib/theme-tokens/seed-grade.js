import { applyThemeOverrides } from "./apply-overrides.js";
import { resolveAppTheme } from "./app-theme.js";
import { themeContrastPairs } from "./contrast-pairs.js";
const PARTIAL_SCORE = 50;
/**
 * Grades a palette by what its *generated* theme achieves in both modes, not by
 * the seed colour in isolation: the engine solves the action stop and the
 * on-colours, so a raw hex says very little about the palette it produces.
 */
export function gradePalette(palette, tokenOverrides) {
    const lightTheme = applyThemeOverrides(resolveAppTheme(palette, "light"), tokenOverrides?.light ?? {});
    const darkTheme = applyThemeOverrides(resolveAppTheme(palette, "dark"), tokenOverrides?.dark ?? {});
    const pairs = [
        ...themeContrastPairs(lightTheme),
        ...themeContrastPairs(darkTheme),
    ];
    // An exempt role has no criterion to score against, so counting it would only
    // pad the average with a free 100%. The grade is what the gated pairs earned.
    const gated = pairs.filter((pair) => pair.verdict !== "exempt");
    const achieved = gated.map((pair) => {
        const { wcag, apca } = pair.report;
        const ratioShare = wcag.required <= 0 ? 1 : wcag.ratio / wcag.required;
        const lcShare = apca.required <= 0 ? 1 : Math.abs(apca.lc) / apca.required;
        return Math.min(1, ratioShare, lcShare);
    });
    const score = achieved.length === 0
        ? 100
        : Math.round((achieved.reduce((sum, value) => sum + value, 0) / achieved.length) * 100);
    const failing = gated.filter((pair) => pair.verdict === "fail");
    const level = failing.length > 0
        ? score >= PARTIAL_SCORE
            ? "Partial"
            : "Fail"
        : gated.every((pair) => pair.report.wcag.level === "AAA")
            ? "AAA"
            : "AA";
    return { seed: palette.seed, score, level, pairs, failing };
}
