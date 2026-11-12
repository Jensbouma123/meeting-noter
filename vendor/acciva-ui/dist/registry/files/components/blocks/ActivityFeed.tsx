import { Activity } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTone } from "@/components/ui/Badge/index";
import { Card } from "@/components/ui/Card/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading/index";
import { RowList } from "@/components/ui/RowList/index";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  actor: string;
  actorSrc?: string;
  action: string;
  time: string;
  tone?: BadgeTone;
  tag?: string;
}

export interface ActivityFeedProps {
  events: readonly ActivityEvent[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ActivityFeed({
  events,
  title = "Activity",
  emptyTitle = "No activity yet",
  emptyDescription = "Recent actions will appear here.",
  className,
}: ActivityFeedProps) {
  return (
    <Card padding="md" className={cn("w-full", className)} aria-label={title}>
      <VStack spacing="md">
        <Heading level={2} size="lg">
          {title}
        </Heading>

        {events.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-7" aria-hidden="true" />}
            title={emptyTitle}
            description={emptyDescription}
            size="sm"
          />
        ) : (
          <RowList aria-label={title} divided className="w-full">
            {events.map((event) => (
              <RowList.Item
                key={event.id}
                leading={<Avatar src={event.actorSrc} name={event.actor} size="sm" aria-hidden="true" />}
                title={
                  <>
                    <span className="font-medium">{event.actor}</span>{" "}
                    <span className="text-muted-foreground">{event.action}</span>
                  </>
                }
                meta={event.time}
                trailing={event.tag ? <Badge variant={event.tone ?? "neutral"}>{event.tag}</Badge> : undefined}
              />
            ))}
          </RowList>
        )}
      </VStack>
    </Card>
  );
}
