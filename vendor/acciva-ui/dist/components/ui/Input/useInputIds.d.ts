import { type ReactNode } from "react";
/** Returns `[inputId, hintId, errorId, charCountId, leadingAddonId, trailingAddonId, describedByIds]`. */
export declare function useInputIds(id: string | undefined, hint: string | undefined, activeError: string | undefined, showCharCount: boolean, leadingAddon: ReactNode, trailingAddon: ReactNode, describedBy: string | undefined): readonly [string, string | undefined, string | undefined, string | undefined, string | undefined, string | undefined, string | undefined];
