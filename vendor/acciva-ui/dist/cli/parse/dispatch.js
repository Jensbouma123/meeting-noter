import { CliError, CliHelp } from "./errors.js";
import { parseAddArgs, parseListArgs } from "./subcommands.js";
import { parseThemeArgs } from "./theme.js";
import { addUsage, listUsage, mainUsage, usage } from "./usage.js";
const HELP_FLAGS = new Set(["--help", "-h", "help"]);
const COMMAND_USAGE = { theme: usage, list: listUsage, add: addUsage };
/** Top-level dispatch: `theme` keeps its own parser and messages unchanged. */
export function parseArgs(argv) {
    const [command, ...rest] = argv;
    if (command === undefined || HELP_FLAGS.has(command))
        return { command: "help" };
    if (command !== "theme" && command !== "list" && command !== "add") {
        throw new CliError(`Unknown command "${command}".\n\n${mainUsage()}`);
    }
    if (rest.some((arg) => arg === "--help" || arg === "-h"))
        throw new CliHelp(COMMAND_USAGE[command]());
    if (command === "theme")
        return { command, options: parseThemeArgs(argv) };
    if (command === "list")
        return { command, options: parseListArgs(rest) };
    return { command, options: parseAddArgs(rest) };
}
