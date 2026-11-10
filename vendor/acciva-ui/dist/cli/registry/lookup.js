/** `DataTable`, `datatable`, `data-table` and `data_table` all name the same component. */
function normalise(name) {
    return name.toLowerCase().replace(/[-_\s]/g, "");
}
export function findComponent(registry, name) {
    const wanted = normalise(name);
    return (registry.components.find((component) => normalise(component.name) === wanted) ??
        registry.components.find((component) => component.aliases.some((alias) => normalise(alias) === wanted)));
}
function editDistance(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= b.length; j += 1) {
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        previous = current;
    }
    return previous[b.length];
}
/** Closest component name, or undefined when nothing is near enough to be a typo. */
export function suggestComponent(registry, name) {
    const wanted = normalise(name);
    let best;
    for (const component of registry.components) {
        for (const candidate of [component.name, ...component.aliases]) {
            const lower = normalise(candidate);
            const distance = lower.startsWith(wanted) || wanted.startsWith(lower) ? 1 : editDistance(wanted, lower);
            if (best === undefined || distance < best.distance)
                best = { name: component.name, distance };
        }
    }
    return best !== undefined && best.distance <= Math.max(2, Math.floor(wanted.length / 3)) ? best.name : undefined;
}
