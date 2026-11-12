import { useId, type ReactNode } from "react";

/** Returns `[inputId, hintId, errorId, charCountId, leadingAddonId, trailingAddonId, describedByIds]`. */
export function useInputIds(
  id: string | undefined,
  hint: string | undefined,
  activeError: string | undefined,
  showCharCount: boolean,
  leadingAddon: ReactNode,
  trailingAddon: ReactNode,
  describedBy: string | undefined,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const hintId = hint && !activeError ? `${inputId}-hint` : undefined;
  const errorId = activeError ? `${inputId}-error` : undefined;
  const charCountId = showCharCount ? `${inputId}-charcount` : undefined;
  const leadingAddonId = leadingAddon ? `${inputId}-leading-addon` : undefined;
  const trailingAddonId = trailingAddon ? `${inputId}-trailing-addon` : undefined;

  const describedByIds =
    [describedBy, leadingAddonId, trailingAddonId, hintId, errorId, charCountId].filter(Boolean).join(" ") ||
    undefined;

  return [inputId, hintId, errorId, charCountId, leadingAddonId, trailingAddonId, describedByIds] as const;
}
