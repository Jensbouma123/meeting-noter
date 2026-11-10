import type { ThemeMode } from "../color/index.js";
import { type AppTheme, type RadiusScale } from "../theme-tokens/index.js";
import type { ModeTokenOverrides } from "./types.js";
export declare function applyTokensToDom(theme: AppTheme, radius?: RadiusScale, tokenOverrides?: ModeTokenOverrides | Record<string, string>): void;
export declare function applyStylesheetThemeToDom(mode: ThemeMode, radius: RadiusScale, tokenOverrides: ModeTokenOverrides): void;
