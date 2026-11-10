export const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920];
/** Default loader appends a `w` query param, which every mainstream CDN honours. */
export function defaultLoader(src, width) {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}w=${width}`;
}
export function buildSrcSet(src, widths, loader) {
    return widths.map((width) => `${loader(src, width)} ${width}w`).join(", ");
}
