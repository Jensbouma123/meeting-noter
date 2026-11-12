import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { RowList } from "@/components/ui/RowList/index";
import { StatusDot, type StatusDotTone } from "@/components/ui/StatusDot";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { focusNeighbour } from "@/lib/focus-neighbour";
import { cn } from "@/lib/utils";

import type { NotificationCenterProps, NotificationTone } from "@/components/blocks/NotificationCenter/NotificationCenterTypes";

export type { NotificationCenterProps, NotificationItem, NotificationTone } from "@/components/blocks/NotificationCenter/NotificationCenterTypes";

// Secondary and accent have no StatusDot tone, so their unread dot reads as brand.
const UNREAD_DOT_TONE: Record<NotificationTone, StatusDotTone> = {
  primary: "brand",
  secondary: "brand",
  accent: "brand",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
};

export function NotificationCenter({
  notifications,
  title = "Notifications",
  emptyTitle = "You're all caught up",
  emptyDescription = "New notifications will appear here.",
  markAllLabel = "Mark all read",
  onMarkAllRead,
  onDismiss,
  onSelect,
  className,
}: NotificationCenterProps) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Card padding="md" className={cn("w-full", className)} aria-label={title}>
      <VStack spacing="md">
        <HStack justify="between" align="center">
          <HStack spacing="sm" align="center">
            <Heading level={2} size="lg">
              {title}
            </Heading>
            {unread > 0 ? (
              <Badge variant="primary" aria-label={`${unread} unread notifications`}>
                {unread}
              </Badge>
            ) : null}
          </HStack>
          {onMarkAllRead && unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
              {markAllLabel}
            </Button>
          ) : null}
        </HStack>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-7" aria-hidden="true" />}
            title={emptyTitle}
            description={emptyDescription}
            size="sm"
          />
        ) : (
          <RowList aria-label={title} divided className="w-full">
            {notifications.map((item) => (
              <RowList.Item
                key={item.id}
                leading={
                  <StatusDot
                    tone={item.read ? "neutral" : UNREAD_DOT_TONE[item.tone ?? "primary"]}
                    label={item.read ? "Read" : "Unread"}
                  />
                }
                title={
                  onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className="focus-ring min-h-11 rounded text-left sm:min-h-0"
                      aria-label={`${item.title}${item.read ? "" : ", unread"}`}
                    >
                      {item.title}
                    </button>
                  ) : (
                    item.title
                  )
                }
                meta={
                  item.body || onDismiss ? (
                    <>
                      {item.body}
                      {onDismiss ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          data-dismiss=""
                          onClick={(event) => {
                            focusNeighbour(event.currentTarget, "[data-dismiss]");
                            onDismiss(item.id);
                          }}
                          aria-label={`Dismiss notification: ${item.title}`}
                        >
                          Dismiss
                        </Button>
                      ) : null}
                    </>
                  ) : undefined
                }
                trailing={
                  <Text as="span" size="xs" variant="muted">
                    {item.time}
                  </Text>
                }
              />
            ))}
          </RowList>
        )}
      </VStack>
    </Card>
  );
}
