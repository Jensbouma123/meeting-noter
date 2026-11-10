export const HARMONIES = [
    "complementary",
    "analogous",
    "triadic",
    "split-complementary",
    "tetradic",
    "monochromatic",
];
export const FORMATS = ["css", "tailwind", "dtcg"];
export const DEFAULT_THEME_HARMONY = "complementary";
export const DEFAULT_THEME_FORMAT = "css";
const HEX_SEED = /^#[0-9a-fA-F]{6}$/;
export class CliError extends Error {
    constructor() {
        super(...arguments);
        this.exitCode = 1;
    }
}
export function usage() {
    return [
        "Usage: acciva theme <seed> [options]",
        "",
        "Generate a WCAG 2.2 AA theme from a brand seed.",
        "",
        "Arguments:",
        "  <seed>                 brand color as #rrggbb (e.g. \"#0ea5e9\")",
        "",
        "Options:",
        "  --harmony <name>       complementary (default), analogous, triadic,",
        "                         split-complementary, tetradic, monochromatic",
        "  --format <format>      css (default), tailwind, dtcg",
        "  --out <path>           write to a file instead of stdout",
        "  --json                 emit a machine-readable report instead of the theme",
        "",
        "Exit code is 0 when the theme passes AA, 1 otherwise.",
    ].join("\n");
}
function isHarmony(value) {
    return HARMONIES.includes(value);
}
function isFormat(value) {
    return FORMATS.includes(value);
}
function takeValue(flag, argv, index) {
    const value = argv[index];
    if (value === undefined || value.startsWith("--")) {
        throw new CliError(`${flag} needs a value.\n\n${usage()}`);
    }
    return value;
}
export function parseThemeArgs(argv) {
    const [command, seed, ...rest] = argv;
    if (command !== "theme") {
        throw new CliError(`Expected "theme" but got ${command === undefined ? "nothing" : `"${command}"`}.\n\n${usage()}`);
    }
    if (seed === undefined) {
        throw new CliError(`Missing <seed> (e.g. acciva theme "#0ea5e9").\n\n${usage()}`);
    }
    if (!HEX_SEED.test(seed)) {
        throw new CliError(`Invalid seed "${seed}": expected #rrggbb (e.g. "#0ea5e9").\n\n${usage()}`);
    }
    let harmony = DEFAULT_THEME_HARMONY;
    let format = DEFAULT_THEME_FORMAT;
    let out;
    let json = false;
    for (let index = 0; index < rest.length; index += 1) {
        const flag = rest[index];
        if (flag === "--harmony") {
            const value = takeValue(flag, rest, index + 1);
            if (!isHarmony(value)) {
                throw new CliError(`Invalid harmony "${value}": expected ${HARMONIES.join(", ")}.\n\n${usage()}`);
            }
            harmony = value;
            index += 1;
        }
        else if (flag === "--format") {
            const value = takeValue(flag, rest, index + 1);
            if (!isFormat(value)) {
                throw new CliError(`Invalid format "${value}": expected ${FORMATS.join(", ")}.\n\n${usage()}`);
            }
            format = value;
            index += 1;
        }
        else if (flag === "--out") {
            out = takeValue(flag, rest, index + 1);
            index += 1;
        }
        else if (flag === "--json") {
            json = true;
        }
        else if (flag !== undefined && flag.startsWith("--")) {
            throw new CliError(`Unknown option "${flag}".\n\n${usage()}`);
        }
        else {
            throw new CliError(`Unexpected argument "${flag}".\n\n${usage()}`);
        }
    }
    return { seed, harmony, format, out, json };
}
