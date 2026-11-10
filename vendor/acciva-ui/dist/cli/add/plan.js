import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { CliError } from "../parse/index.js";
import { findComponent, rewriteImports, selectComponents, suggestComponent, targetPathFor, } from "../registry/index.js";
import { isInside, realAncestor, resolveTarget } from "./target.js";
function toPosix(path) {
    return path.split(sep).join(posix.sep);
}
function emptyReport(dryRun, errors) {
    return { components: [], added: [], skipped: [], files: [], peerDependencies: {}, devDependencies: {}, notes: [], errors, dryRun };
}
function resolveNames(registry, names) {
    const components = [];
    const errors = [];
    for (const name of names) {
        const component = findComponent(registry, name);
        if (component !== undefined) {
            if (!components.includes(component))
                components.push(component);
            continue;
        }
        const suggestion = suggestComponent(registry, name);
        errors.push(`Unknown component "${name}".${suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`} Run \`acciva list\` to see them all.`);
    }
    return { components, errors };
}
export function planAndWrite(options, registry, registryDir, cwd) {
    const { components, errors } = resolveNames(registry, options.names);
    if (errors.length > 0)
        return emptyReport(options.dryRun, errors);
    let target;
    try {
        target = resolveTarget(cwd, options.path);
    }
    catch (error) {
        if (error instanceof CliError)
            return emptyReport(options.dryRun, [error.message]);
        throw error;
    }
    const realRoot = realpathSync(cwd);
    const selection = selectComponents(registry, components);
    const added = [];
    const skipped = [];
    const notes = [];
    const writeErrors = [];
    const files = selection.files.map((from) => {
        const destination = join(target, targetPathFor(from));
        return { from, to: toPosix(relative(cwd, destination)), destination };
    });
    for (const { from, to, destination } of files) {
        const content = rewriteImports(readFileSync(join(registryDir, "files", from), "utf8"), from, registry.files);
        const existing = lstatSync(destination, { throwIfNoEntry: false });
        if (existing !== undefined) {
            if (existing.isSymbolicLink() || !existing.isFile()) {
                writeErrors.push(`${to} exists and is not a regular file; refusing to write through it.`);
                continue;
            }
            if (readFileSync(destination, "utf8") === content) {
                skipped.push(to);
                continue;
            }
            if (!options.overwrite) {
                skipped.push(to);
                notes.push(`${to} already exists and differs from the registry copy; kept yours (pass --overwrite to replace it).`);
                continue;
            }
        }
        if (!isInside(realRoot, realAncestor(dirname(destination)))) {
            writeErrors.push(`${to} resolves outside the project root through a symlink; skipped.`);
            continue;
        }
        if (!options.dryRun) {
            try {
                mkdirSync(dirname(destination), { recursive: true });
                writeFileSync(destination, content, { encoding: "utf8", flag: existing === undefined ? "wx" : "w" });
            }
            catch (error) {
                writeErrors.push(`${to}: ${error instanceof Error ? error.message : String(error)}`);
                continue;
            }
        }
        added.push(to);
    }
    const peers = Object.entries(selection.peerDependencies);
    if (peers.length > 0) {
        notes.push(`Install any of these peers you are missing: npm install ${peers.map(([name, range]) => `${name}@"${range}"`).join(" ")}`);
    }
    const devTypes = Object.keys(selection.devDependencies);
    if (devTypes.length > 0) {
        notes.push(`Install these dev type packages if missing (the copies read process.env.NODE_ENV): npm install -D ${devTypes.join(" ")}`);
    }
    notes.push(`Import the styles once in your global CSS: @import "${registry.package}/styles"; (or the theme file \`acciva theme <seed> --out <file>\` wrote). Keep ${registry.package} installed for it.`);
    return {
        components: selection.components.map((component) => component.name),
        added,
        skipped,
        files: files.map(({ from, to }) => ({ from, to })),
        peerDependencies: selection.peerDependencies,
        devDependencies: selection.devDependencies,
        notes,
        errors: writeErrors,
        dryRun: options.dryRun,
    };
}
