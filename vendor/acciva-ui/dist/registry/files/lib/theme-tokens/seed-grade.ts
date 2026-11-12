import type { Hex } from "@/lib/color/index";
import type { AppPalette } from "@/lib/theme-tokens/app-palette";
import { applyThemeOverrides } from "@/lib/theme-tokens/apply-overrides";
import { resolveAppTheme } from "@/lib/theme-tokens/app-theme";
import { themeContrastPairs, type ThemeContrastPair } from "@/lib/theme-tokens/contrast-pairs";

export type SeedGradeLevel = "AAA" | "AA" | "Partial" | "Fail";

export type SeedGrade = {
  readonly seed: Hex;
  readonly score: number;
  readonly level: SeedGradeLevel;
  readonly pairs: readonly ThemeContrastPair[];
  readonly failing: readonly ThemeContrastPair[];
};

const PARTIAL_SCORE = 50;

/**
 * Grades a palette by what its *generated* theme achieves in both modes, not by
 * the seed colour in isolation: the engine solves the action stop and the
 * on-colours, so a raw hex says very little about the palette it produces.
 */
export function gradePalette(
  palette: AppPalette,
  tokenOverrides?: { light?: Record<string, string>; dark?: Record<string, string> },
): SeedGrade {
  const lightTheme = applyThemeOverrides(
    resolveAppTheme(palette, "light"),
    tokenOverrides?.light ?? {},
  );
  const darkTheme = applyThemeOverrides(
    resolveAppTheme(palette, "dark"),
    tokenOverrides?.dark ?? {},
  );
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
  const score =
    achieved.length === 0
      ? 100
      : Math.round((achieved.reduce((sum, value) => sum + value, 0) / achieved.length) * 100);
  const failing = gated.filter((pair) => pair.verdict === "fail");

  const level: SeedGradeLevel =
    failing.length > 0
      ? score >= PARTIAL_SCORE
        ? "Partial"
        : "Fail"
      : gated.every((pair) => pair.report.wcag.level === "AAA")
        ? "AAA"
        : "AA";

  return { seed: palette.seed, score, level, pairs, failing };
}
