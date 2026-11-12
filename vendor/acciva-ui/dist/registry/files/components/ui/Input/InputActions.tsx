import type { ReactNode } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import {
  ICON_SCALE_CLASS,
  INPUT_ICON_INSET_TRAILING,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { CLEAR_BUTTON_SIZE } from "@/components/ui/Input/constants";

interface InputActionsProps {
  size: ResponsiveSize<SizeTier>;
  label?: string;
  showClear: boolean;
  showPasswordToggle: boolean;
  trailingIcon?: ReactNode;
  revealed: boolean;
  onClear: () => void;
  onToggleReveal: () => void;
}

export function InputActions({
  size,
  label,
  showClear,
  showPasswordToggle,
  trailingIcon,
  revealed,
  onClear,
  onToggleReveal,
}: InputActionsProps) {
  if (!(showClear || showPasswordToggle || trailingIcon)) return null;
  return (
    <HStack
      spacing="xs"
      className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET_TRAILING))}
    >
      {showClear ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={label ? `Clear ${label}` : "Clear input"}
          onClick={onClear}
          className={cn(
            "focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3",
            resolveResponsive(size, CLEAR_BUTTON_SIZE),
            resolveResponsive(size, ICON_SCALE_CLASS),
          )}
        >
          <X className="shrink-0" />
        </button>
      ) : null}

      {showPasswordToggle ? (
        <button
          type="button"
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          onClick={onToggleReveal}
          className={cn(
            "focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3",
            resolveResponsive(size, CLEAR_BUTTON_SIZE),
            resolveResponsive(size, ICON_SCALE_CLASS),
            typeof size === "string"
              ? touchTargetClass(size)
              : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined,
          )}
        >
          {revealed ? <EyeOff className="shrink-0" /> : <Eye className="shrink-0" />}
        </button>
      ) : null}

      {trailingIcon ? (
        <span className={cn("pointer-events-none flex items-center justify-center", resolveResponsive(size, ICON_SCALE_CLASS))}>
          {trailingIcon}
        </span>
      ) : null}
    </HStack>
  );
}
