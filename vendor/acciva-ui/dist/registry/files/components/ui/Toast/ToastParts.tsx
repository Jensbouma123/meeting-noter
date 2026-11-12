import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button/index";
import { VARIANT_ACCENT_TEXT, VARIANT_ICON } from "@/components/ui/variant-tokens";
import { cn } from "@/lib/utils";
import { TOAST_BAR } from "@/components/ui/Toast/constants";
import type { ToastRecord } from "@/components/ui/Toast/types";

interface ToastCardProps {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

export function ToastCard({ toast, onDismiss, onPause, onResume }: ToastCardProps) {
  const engagedRef = useRef({ hover: false, focus: false });

  function setEngagement(next: Partial<{ hover: boolean; focus: boolean }>) {
    const was = engagedRef.current.hover || engagedRef.current.focus;
    engagedRef.current = { ...engagedRef.current, ...next };
    const is = engagedRef.current.hover || engagedRef.current.focus;
    if (was === is) return;
    if (is) onPause(toast.id);
    else onResume(toast.id);
  }

  const Icon = VARIANT_ICON[toast.variant];
  const { action } = toast;
  const leaving = toast.status === "leaving";

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 shadow-lg",
        "motion-safe:transition-all motion-safe:motion-feedback motion-safe:animate-fade-in",
        leaving ? "opacity-0 motion-safe:translate-y-1" : "opacity-100 translate-y-0",
      )}
      onMouseEnter={() => setEngagement({ hover: true })}
      onMouseLeave={() => setEngagement({ hover: false })}
      onFocus={() => setEngagement({ focus: true })}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setEngagement({ focus: false });
      }}
    >
      <span aria-hidden="true" data-toast-bar className={cn("absolute inset-y-0 left-0 w-1", TOAST_BAR[toast.variant])} />
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", VARIANT_ACCENT_TEXT[toast.variant])} />
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-sm font-semibold text-foreground">{toast.title}</p> : null}
        {toast.description ? (
          <p className={cn("text-sm text-muted-foreground", toast.title ? "mt-0.5" : undefined)}>
            {toast.description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                action.onClick();
                onDismiss(toast.id);
              }}
            >
              {action.label}
            </Button>
          </div>
        ) : null}
      </div>
      {toast.dismissible ? (
        <Button
          iconOnly
          tooltip="Dismiss notification"
          variant="ghost"
          size="xxs"
          className="-mt-1 -mr-1 shrink-0"
          onClick={() => onDismiss(toast.id)}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
