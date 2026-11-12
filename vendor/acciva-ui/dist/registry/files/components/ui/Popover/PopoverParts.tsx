import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { Tooltip } from "@/components/ui/Tooltip/index";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export function PopoverHeader({
  title,
  titleId,
  onClose,
}: {
  title: ReactNode;
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div className={cn("flex items-start gap-2", title ? "justify-between" : "justify-end")}>
      {title && (
        <h2 id={titleId} className={cn("font-semibold text-foreground leading-snug break-words", TEXT_SIZE.sm)}>
          {title}
        </h2>
      )}
      <Tooltip content="Close" delay={150}>
        <span className="inline-flex shrink-0 -mr-1 -mt-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            data-dialog-close
            onClick={onClose}
            onFocus={(e) => e.stopPropagation()}
            className="touch-target-44 justify-center p-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </span>
      </Tooltip>
    </div>
  );
}

export function PopoverBody({
  id,
  hasTitle,
  children,
}: {
  id: string;
  hasTitle: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "popover-body text-muted-foreground break-words whitespace-normal overflow-y-auto",
        TEXT_SIZE.xs,
        hasTitle ? "mt-1.5" : "mt-0",
      )}
    >
      {children}
    </div>
  );
}

export function PopoverAction({ label, onAction }: { label: string; onAction: () => void }) {
  return (
    <div className="mt-3 flex justify-end">
      <Button variant="primary" size="xs" onClick={onAction}>
        {label}
      </Button>
    </div>
  );
}
