#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { generateTheme } from "../lib/color/theme.js";
import { CliError, parseThemeArgs, usage } from "./parse.js";
import { runThemeCommand } from "./run.js";
function fail(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}
function main() {
    let options;
    try {
        options = parseThemeArgs(process.argv.slice(2));
    }
    catch (error) {
        if (error instanceof CliError)
            fail(error.message);
        else
            throw error;
    }
    const result = runThemeCommand(options, generateTheme);
    const body = `${result.stdout}\n`;
    if (options.out !== undefined) {
        mkdirSync(dirname(options.out), { recursive: true });
        writeFileSync(options.out, body, "utf8");
    }
    else {
        process.stdout.write(body);
    }
    if (result.stderr !== "") {
        process.stderr.write(`${result.stderr}\n`);
    }
    if (result.exitCode !== 0) {
        process.exit(result.exitCode);
    }
}
try {
    main();
}
catch (error) {
    if (error instanceof CliError)
        fail(error.message);
    else if (error instanceof Error)
        fail(`${error.message}\n\n${usage()}`);
    else
        fail("Unexpected error.");
}
