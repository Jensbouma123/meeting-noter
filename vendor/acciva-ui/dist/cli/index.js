#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateTheme } from "../lib/color/theme.js";
import { runAddCommand, runListCommand } from "./add/index.js";
import { CliError, CliHelp, mainUsage, parseArgs } from "./parse/index.js";
import { runThemeCommand } from "./run.js";
// `dist/registry/`, written next to `dist/cli/` by scripts/build-registry.ts.
const REGISTRY_DIR = fileURLToPath(new URL("../registry", import.meta.url));
function fail(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
}
function report(result) {
    if (result.stdout !== "")
        process.stdout.write(`${result.stdout}\n`);
    if (result.stderr !== "")
        process.stderr.write(`${result.stderr}\n`);
    if (result.exitCode !== 0)
        process.exit(result.exitCode);
}
function theme(options) {
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
function main() {
    let parsed;
    try {
        parsed = parseArgs(process.argv.slice(2));
    }
    catch (error) {
        if (error instanceof CliHelp) {
            process.stdout.write(`${error.message}\n`);
            return;
        }
        if (error instanceof CliError)
            fail(error.message);
        else
            throw error;
    }
    if (parsed.command === "help")
        process.stdout.write(`${mainUsage()}\n`);
    else if (parsed.command === "theme")
        theme(parsed.options);
    else if (parsed.command === "list")
        report(runListCommand(parsed.options, REGISTRY_DIR));
    else
        report(runAddCommand(parsed.options, REGISTRY_DIR, process.cwd()));
}
try {
    main();
}
catch (error) {
    if (error instanceof CliError)
        fail(error.message);
    else if (error instanceof Error)
        fail(`${error.message}\n\n${mainUsage()}`);
    else
        fail("Unexpected error.");
}
