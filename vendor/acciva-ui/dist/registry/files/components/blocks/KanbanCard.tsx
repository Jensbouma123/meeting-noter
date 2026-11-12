import { useId } from "react";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { cn } from "@/lib/utils";
import { KanbanCardBody } from "@/components/blocks/KanbanCard/KanbanCardParts";
import { kanbanCardSummary } from "@/components/blocks/KanbanCard/KanbanCardMeta";
import type { KanbanCardProps } from "@/components/blocks/KanbanCard/KanbanCardTypes";

export type { KanbanCardProps, KanbanCategory, KanbanStatus } from "@/components/blocks/KanbanCard/KanbanCardTypes";

export function KanbanCard({
  ticketKey,
  title,
  status,
  category,
  labels = [],
  blockedBy = [],
  counter,
  branch,
  hasDescription = false,
  onOpen,
  primaryAction,
  className,
  ...props
}: KanbanCardProps) {
  const id = useId();
  const keyId = `${id}-key`;
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const needsDecision = status === "needsDecision";
  const summary = kanbanCardSummary({ status, category, labels, blockedBy, counter });

  const body = (
    <KanbanCardBody
      ticketKey={ticketKey}
      title={title}
      status={status}
      category={category}
      labels={labels}
      blockedBy={blockedBy}
      counter={counter}
      branch={branch}
      hasDescription={hasDescription}
      keyId={keyId}
      titleId={titleId}
    />
  );

  const cardClass = cn("w-full text-start", needsDecision && "border-warning/20 dark:border-warning/30");

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {onOpen ? (
        <Card asChild padding="sm" className={cardClass}>
          <button
            type="button"
            onClick={onOpen}
            aria-labelledby={`${keyId} ${titleId}`}
            aria-describedby={descId}
          >
            {body}
            <span id={descId} className="sr-only">
              {summary}
            </span>
          </button>
        </Card>
      ) : (
        <Card padding="sm" role="group" aria-labelledby={`${keyId} ${titleId}`} aria-describedby={descId} className={cardClass}>
          {body}
          <span id={descId} className="sr-only">
            {summary}
          </span>
        </Card>
      )}
      {primaryAction && (
        <Button variant="secondary" size="sm" onClick={primaryAction.onAction}>
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}
