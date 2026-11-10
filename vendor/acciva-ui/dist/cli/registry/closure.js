/** Transitive internal files of `entry`, in first-visit order. */
export function fileClosure(registry, entry, seen = new Set()) {
    const order = [];
    const visit = (path) => {
        if (seen.has(path))
            return;
        const file = registry.files[path];
        if (file === undefined)
            throw new Error(`Registry is missing "${path}".`);
        seen.add(path);
        order.push(path);
        for (const dependency of file.imports)
            visit(dependency);
    };
    visit(entry);
    return order;
}
/** Components (other than `component` itself) whose file is part of its closure. */
export function componentDependencies(registry, component) {
    const closure = new Set(fileClosure(registry, component.file));
    return registry.components
        .filter((other) => other !== component && closure.has(other.file))
        .map((other) => other.name);
}
export function selectComponents(registry, components) {
    const seen = new Set();
    const files = components.flatMap((component) => fileClosure(registry, component.file, seen));
    const peers = [...new Set(files.flatMap((path) => registry.files[path].peers))].sort();
    const peerDependencies = Object.fromEntries(peers.map((peer) => [peer, registry.peerDependencies[peer] ?? "*"]));
    const types = [...new Set(files.flatMap((path) => registry.files[path].types ?? []))].sort();
    const devDependencies = Object.fromEntries(types.map((name) => [name, "*"]));
    const fileSet = new Set(files);
    const pulledIn = registry.components.filter((component) => !components.includes(component) && fileSet.has(component.file));
    return { components: [...components, ...pulledIn], files, peerDependencies, devDependencies };
}
