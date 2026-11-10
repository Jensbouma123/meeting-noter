import { generateTheme } from "../lib/color/theme.js";
export function selectFormatOutput(theme, format) {
    if (format === "tailwind")
        return theme.tailwind;
    if (format === "dtcg")
        return theme.dtcg;
    return theme.css;
}
export function buildJsonReport(theme, format) {
    return {
        seed: theme.seed,
        harmony: theme.harmony,
        passesAA: theme.passesAA,
        unresolvable: theme.unresolvable,
        failures: theme.audit.failures,
        [format]: selectFormatOutput(theme, format),
    };
}
export function formatUnresolvableLine(entry) {
    return `role ${entry.role}: could not reach contrast ratio ${entry.required} (${entry.reason})`;
}
export function buildFailureStderr(theme) {
    const lines = theme.unresolvable.map(formatUnresolvableLine);
    lines.push(`Theme from seed "${theme.seed}" does not pass WCAG 2.2 AA (${theme.audit.failures.length} failing pair${theme.audit.failures.length === 1 ? "" : "s"}).`, "Try a different seed: this tool reports the miss but does not pick a seed for you.");
    return lines.join("\n");
}
export function runThemeCommand(options, generate = generateTheme) {
    const theme = generate(options.seed, { harmony: options.harmony });
    const stdout = options.json
        ? JSON.stringify(buildJsonReport(theme, options.format))
        : selectFormatOutput(theme, options.format);
    if (theme.passesAA) {
        return { exitCode: 0, stdout, stderr: "" };
    }
    return { exitCode: 1, stdout, stderr: buildFailureStderr(theme) };
}
