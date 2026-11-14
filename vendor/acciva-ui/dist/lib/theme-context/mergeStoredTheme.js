// Builds the snapshot to persist: each field takes the patch, else what is already
// stored, else the in-session value passed as `fallback`.
export function mergeStoredTheme(patch, stored, fallback) {
    // Only an explicit light/dark is stored; absence means System.
    const storedMode = patch.mode === undefined ? stored?.mode : patch.mode === "system" ? undefined : patch.mode;
    return {
        primaryHex: patch.primaryHex ?? stored?.primaryHex ?? fallback.primaryHex,
        harmony: patch.harmony ?? stored?.harmony ?? fallback.harmony,
        mode: storedMode,
        radius: patch.radius ?? stored?.radius ?? fallback.radius,
        tokenOverrides: patch.tokenOverrides ?? stored?.tokenOverrides ?? fallback.tokenOverrides,
    };
}
