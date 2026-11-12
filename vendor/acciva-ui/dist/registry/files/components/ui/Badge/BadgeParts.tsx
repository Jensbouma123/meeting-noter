import { X } from "lucide-react";
import { resolveResponsive, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { CHIP_DISMISS_SIZE } from "@/components/ui/Badge/classes";

export function BadgeDot({ className }: { className: string }) {
  return <span className={cn("size-1.5 rounded-full shrink-0", className)} />;
}

export function BadgeDismiss({
  label,
  size,
  disabled,
  onDismiss,
}: {
  label: string;
  size: ResponsiveSize<SizeTier>;
  disabled: boolean;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onDismiss}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors motion-feedback hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3 active:text-foreground active:scale-99 disabled:cursor-not-allowed dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
        resolveResponsive(size, CHIP_DISMISS_SIZE),
      )}
    >
      <X aria-hidden="true" />
    </button>
  );
}
