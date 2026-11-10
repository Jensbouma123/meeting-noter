import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CliError } from "../parse/index.js";
import { isSafeRegistryPath } from "../registry/index.js";
export function loadRegistry(registryDir) {
    const file = join(registryDir, "registry.json");
    if (!existsSync(file)) {
        throw new CliError(`No component registry at ${file}. It ships in the published package; from a source checkout run \`npm run build:lib\` first.`);
    }
    const registry = JSON.parse(readFileSync(file, "utf8"));
    if (registry.schema !== 1)
        throw new CliError(`Unsupported registry schema ${String(registry.schema)} in ${file}.`);
    for (const path of Object.keys(registry.files)) {
        if (!isSafeRegistryPath(path))
            throw new CliError(`Registry entry "${path}" is not a safe relative path.`);
    }
    return registry;
}
