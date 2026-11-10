import { componentDependencies, fileClosure } from "../registry/index.js";
import { loadRegistry } from "./load.js";
import { planAndWrite } from "./plan.js";
function formatAddReport(report) {
    const lines = [];
    if (report.components.length > 0)
        lines.push(`Components: ${report.components.join(", ")}`);
    if (report.added.length > 0) {
        lines.push(`${report.dryRun ? "Would add" : "Added"} ${report.added.length} file${report.added.length === 1 ? "" : "s"}:`);
        lines.push(...report.added.map((path) => `  + ${path}`));
    }
    if (report.skipped.length > 0) {
        lines.push(`Kept ${report.skipped.length} existing file${report.skipped.length === 1 ? "" : "s"}:`);
        lines.push(...report.skipped.map((path) => `  = ${path}`));
    }
    if (report.notes.length > 0)
        lines.push("", ...report.notes);
    return lines.join("\n");
}
export function runAddCommand(options, registryDir, cwd) {
    const report = planAndWrite(options, loadRegistry(registryDir), registryDir, cwd);
    const exitCode = report.errors.length > 0 ? 1 : 0;
    return {
        exitCode,
        stdout: options.json ? JSON.stringify(report) : formatAddReport(report),
        stderr: report.errors.join("\n"),
    };
}
export function runListCommand(options, registryDir) {
    const registry = loadRegistry(registryDir);
    const components = registry.components.map((component) => ({
        name: component.name,
        kind: component.kind,
        description: component.description,
        aliases: component.aliases,
        files: fileClosure(registry, component.file),
        dependencies: componentDependencies(registry, component),
    }));
    if (options.json) {
        return { exitCode: 0, stdout: JSON.stringify({ package: registry.package, version: registry.version, components }), stderr: "" };
    }
    const width = Math.max(...components.map((component) => component.name.length));
    const lines = components.map((component) => `${component.name.padEnd(width)}  ${component.kind.padEnd(5)}  ${component.description}`);
    return { exitCode: 0, stdout: [...lines, "", "Add one with: acciva add <name...>"].join("\n"), stderr: "" };
}
