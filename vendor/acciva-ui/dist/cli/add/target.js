import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { CliError } from "../parse/index.js";
import { DEFAULT_TARGET } from "../registry/index.js";
export function isInside(root, candidate) {
    const rel = relative(root, candidate);
    return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
/** Real path of `path`'s deepest existing ancestor (itself when it exists), so a symlink cannot smuggle a write out. */
export function realAncestor(path) {
    let current = path;
    while (!existsSync(current) && dirname(current) !== current)
        current = dirname(current);
    return realpathSync(current);
}
/** The absolute target dir, or a CliError when `--path` leaves the project root (cwd), lexically or via a symlink. */
export function resolveTarget(cwd, path) {
    const root = resolve(cwd);
    const target = resolve(root, path ?? DEFAULT_TARGET);
    if (!isInside(root, target) || !isInside(realpathSync(root), realAncestor(target))) {
        throw new CliError(`--path "${path}" resolves outside the project root ${root}; vendored files must live inside it.`);
    }
    return target;
}
