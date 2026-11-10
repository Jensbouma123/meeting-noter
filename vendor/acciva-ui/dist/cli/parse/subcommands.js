import { CliError } from "./errors.js";
import { addUsage, listUsage } from "./usage.js";
export function parseListArgs(rest) {
    let json = false;
    for (const flag of rest) {
        if (flag === "--json")
            json = true;
        else
            throw new CliError(`Unexpected argument "${flag}".\n\n${listUsage()}`);
    }
    return { json };
}
export function parseAddArgs(rest) {
    const names = [];
    let path;
    let overwrite = false;
    let dryRun = false;
    let json = false;
    for (let index = 0; index < rest.length; index += 1) {
        const flag = rest[index];
        if (flag === "--path") {
            const value = rest[index + 1];
            if (value === undefined || value.startsWith("--"))
                throw new CliError(`--path needs a value.\n\n${addUsage()}`);
            path = value;
            index += 1;
        }
        else if (flag === "--overwrite") {
            overwrite = true;
        }
        else if (flag === "--dry-run") {
            dryRun = true;
        }
        else if (flag === "--json") {
            json = true;
        }
        else if (flag.startsWith("-")) {
            throw new CliError(`Unknown option "${flag}".\n\n${addUsage()}`);
        }
        else {
            names.push(flag);
        }
    }
    if (names.length === 0) {
        throw new CliError(`Name at least one component (e.g. acciva add button). Run \`acciva list\` to see them.\n\n${addUsage()}`);
    }
    return { names, path, overwrite, dryRun, json };
}
