import { FileText, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/Badge/index";
import { HStack } from "@/components/ui/HStack";
import { StatusRail } from "@/components/ui/StatusRail";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { CATEGORY, MAX_LABELS, STATUS } from "@/components/blocks/KanbanCard/KanbanCardMeta";
import type { KanbanCardProps } from "@/components/blocks/KanbanCard/KanbanCardTypes";

export interface KanbanCardBodyProps {
  ticketKey: string;
  title: string;
  status: KanbanCardProps["status"];
  category?: KanbanCardProps["category"];
  labels: string[];
  blockedBy: string[];
  counter?: string;
  branch?: string;
  hasDescription: boolean;
  keyId: string;
  titleId: string;
}

export function KanbanCardBody({
  ticketKey,
  title,
  status,
  category,
  labels,
  blockedBy,
  counter,
  branch,
  hasDescription,
  keyId,
  titleId,
}: KanbanCardBodyProps) {
  const { name: statusName, Icon: StatusIcon, tone, iconClass } = STATUS[status];
  const categoryMeta = category ? CATEGORY[category] : undefined;
  const needsDecision = status === "needsDecision";
  const blocked = blockedBy.length > 0;
  const shownLabels = labels.slice(0, MAX_LABELS);
  const hiddenLabels = labels.length - shownLabels.length;

  return (
    <>
      {needsDecision && <StatusRail tone={tone} />}
      <HStack as="span" wrap spacing="sm">
        <Text as="span" id={keyId} size="xs" font="mono" variant="muted">
          {ticketKey}
        </Text>
        {categoryMeta && (
          <Badge variant="neutral" size="xxs">
            <categoryMeta.Icon aria-hidden="true" />
            {categoryMeta.text}
          </Badge>
        )}
        <HStack as="span" spacing="xs" align="center" className="ms-auto">
          <StatusIcon aria-hidden="true" className={cn("size-4 shrink-0", iconClass)} />
          <Text as="span" size="xs" variant="muted">
            {statusName}
          </Text>
        </HStack>
      </HStack>
      <Text
        as="span"
        id={titleId}
        size="sm"
        weight="medium"
        variant={status === "done" ? "muted" : "default"}
        truncate={2}
        className="mt-2 block"
      >
        {title}
      </Text>
      {shownLabels.length > 0 && (
        <HStack as="span" wrap spacing="xs" className="mt-2">
          {shownLabels.map((label) => (
            <Badge key={label} variant="neutral" size="xxs">
              {label}
            </Badge>
          ))}
          {hiddenLabels > 0 && (
            <Text as="span" size="xxs" variant="muted">
              +{hiddenLabels}
            </Text>
          )}
        </HStack>
      )}
      {blocked && (
        <Text as="span" size="xs" variant="danger" className="mt-2 block">
          Blocked by {blockedBy.join(", ")}
        </Text>
      )}
      {(counter || hasDescription || branch) && (
        <HStack as="span" spacing="sm" align="center" className="mt-2 text-muted-foreground">
          {counter && (
            <Text as="span" size="xxs" variant="muted" className="shrink-0">
              {counter}
            </Text>
          )}
          {hasDescription && (
            <span className="inline-flex shrink-0">
              <FileText aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Has description</span>
            </span>
          )}
          {branch && (
            <HStack as="span" spacing="xs" align="center" className="min-w-0">
              <GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
              <Text as="span" size="xxs" font="mono" variant="muted" truncate>
                {branch}
              </Text>
            </HStack>
          )}
        </HStack>
      )}
    </>
  );
}
