import { useCallback, useRef } from "react";
import { buildAppPalette } from "../theme-tokens/index.js";
function paletteMatches(palette, seed, harmony) {
    return palette.harmony === harmony && palette.seed.toLowerCase() === seed.toLowerCase();
}
// The solver is the cost (~200ms desktop, ~2.7s on throttled mobile), so it
// is lazy: nothing is built while the stylesheet already describes the active
// seed and harmony. The palette depends only on seed and harmony, so the last
// one is cached and a light/dark toggle re-picks roles without rebuilding.
export function usePalette(serverPalette) {
    const paletteCache = useRef(null);
    return useCallback((seed, harmonyMode) => {
        if (serverPalette && paletteMatches(serverPalette, seed, harmonyMode))
            return serverPalette;
        const key = `${seed.toLowerCase()}|${harmonyMode}`;
        if (paletteCache.current?.key !== key) {
            paletteCache.current = { key, palette: buildAppPalette(seed, harmonyMode) };
        }
        return paletteCache.current.palette;
    }, [serverPalette]);
}
