import type { HarmonyMode } from "../color/index.js";
import { type AppPalette } from "../theme-tokens/index.js";
export declare function usePalette(serverPalette: AppPalette | undefined): (seed: string, harmonyMode: HarmonyMode) => AppPalette;
