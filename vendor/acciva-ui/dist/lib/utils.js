export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function cn(...inputs) {
    const out = [];
    const walk = (value) => {
        if (!value)
            return;
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        out.push(String(value));
    };
    inputs.forEach(walk);
    return out.join(" ");
}
