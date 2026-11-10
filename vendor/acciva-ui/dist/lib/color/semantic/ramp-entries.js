export function rampEntries(scale) {
    return Object.keys(scale)
        .map((key) => Number(key))
        .sort((a, b) => a - b)
        .map((step) => ({ step, color: scale[step] }));
}
export function nearestByLightness(scale, targetL) {
    const entries = rampEntries(scale);
    let best = entries[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const entry of entries) {
        const distance = Math.abs(entry.color.l - targetL);
        if (distance < bestDistance) {
            best = entry;
            bestDistance = distance;
        }
    }
    return best;
}
function aliasOf(palette, step) {
    return `{color.primitive.${palette}.${step}}`;
}
export function entryToRole(palette, entry, description) {
    return {
        $value: aliasOf(palette, entry.step),
        $description: description,
        palette,
        step: entry.step,
        color: entry.color,
    };
}
