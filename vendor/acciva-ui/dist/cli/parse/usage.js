export function mainUsage() {
    return [
        "Usage: acciva <command> [options]",
        "",
        "Commands:",
        "  theme <seed>           generate a WCAG 2.2 AA theme from a brand seed",
        "  list                   list every component `add` can copy into your repo",
        "  add <name...>          copy component source (and its internal deps) into your repo",
        "",
        "Run `acciva <command> --help` for that command's options.",
    ].join("\n");
}
export function listUsage() {
    return [
        "Usage: acciva list [--json]",
        "",
        "List every vendorable component: name, kind, description, files, internal deps.",
        "",
        "Options:",
        "  --json                 emit one JSON document instead of a table",
    ].join("\n");
}
export function addUsage() {
    return [
        "Usage: acciva add <name...> [options]",
        "",
        "Copy component source and its internal dependencies into this project, with",
        "imports rewritten to relative paths. Names are case-insensitive.",
        "",
        "Options:",
        "  --path <dir>           target directory inside the project (default src/components/acciva)",
        "  --overwrite            replace files that already exist",
        "  --dry-run              print the plan, write nothing",
        "  --json                 emit a machine-readable report",
        "",
        "Exit code is 0 when every requested component resolved and was written (or already",
        "present), 1 on an unknown name, an unsafe --path, or a write error.",
    ].join("\n");
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
