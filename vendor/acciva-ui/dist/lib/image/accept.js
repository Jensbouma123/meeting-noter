export const ACCEPT_PRESETS = {
    images: "image/*",
    documents: ".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.xls,.xlsx,.ods,.ppt,.pptx,.odp",
    pdf: "application/pdf,.pdf",
};
const PRESET_LABELS = {
    images: "Images",
    documents: "Documents",
    pdf: "PDF",
};
const WILDCARD_LABELS = { image: "Images", video: "Videos", audio: "Audio" };
function isPreset(accept) {
    return Object.hasOwn(ACCEPT_PRESETS, accept);
}
/** Native `accept` attribute value; `undefined` when any type is allowed. */
export function resolveAccept(accept) {
    if (!accept)
        return undefined;
    return isPreset(accept) ? ACCEPT_PRESETS[accept] : accept;
}
function tokens(accept) {
    var _a;
    return ((_a = resolveAccept(accept)) !== null && _a !== void 0 ? _a : "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
}
export function matchesAccept(file, accept) {
    const list = tokens(accept);
    if (!list.length)
        return true;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return list.some((t) => {
        if (t.startsWith("."))
            return name.endsWith(t);
        if (!type)
            return false;
        if (t.endsWith("/*"))
            return type.startsWith(t.slice(0, -1));
        return type === t;
    });
}
/** Human summary of an accept value: "Images", "PDF", "PDF, DOCX". Empty when any type is allowed. */
export function describeAccept(accept) {
    if (accept && isPreset(accept))
        return PRESET_LABELS[accept];
    const labels = tokens(accept).map((t) => {
        var _a;
        if (t.startsWith("."))
            return t.slice(1).toUpperCase();
        const [major, minor = ""] = t.split("/");
        if (minor === "*")
            return (_a = WILDCARD_LABELS[major]) !== null && _a !== void 0 ? _a : major.toUpperCase();
        return minor.replace(/^x-/, "").toUpperCase();
    });
    return [...new Set(labels)].join(", ");
}
