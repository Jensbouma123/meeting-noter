import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { RowList } from "@/components/ui/RowList/index";
import { VStack } from "@/components/ui/VStack";
import { focusNeighbour } from "@/lib/focus-neighbour";
import { cn } from "@/lib/utils";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  src?: string;
}

export interface TeamListProps {
  members: readonly TeamMember[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  inviteLabel?: string;
  onInvite?: () => void;
  onRemove?: (id: string) => void;
  removeLabel?: (name: string) => string;
  className?: string;
}

export function TeamList({
  members,
  title = "Team",
  emptyTitle = "No team members yet",
  emptyDescription = "Invite people to get started.",
  inviteLabel = "Invite member",
  onInvite,
  onRemove,
  removeLabel = (name) => `Remove ${name} from team`,
  className,
}: TeamListProps) {
  return (
    <Card padding="md" className={cn("w-full", className)} aria-label={title}>
      <VStack spacing="md">
        <HStack justify="between" align="center">
          <HStack spacing="sm" align="center">
            <Heading level={2} size="lg">
              {title}
            </Heading>
            <Badge variant="neutral" aria-label={`${members.length} team members`}>
              {members.length}
            </Badge>
          </HStack>
          {onInvite ? (
            <Button variant="outline" size="sm" onClick={onInvite}>
              {inviteLabel}
            </Button>
          ) : null}
        </HStack>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-7" aria-hidden="true" />}
            title={emptyTitle}
            description={emptyDescription}
            size="sm"
            action={
              onInvite ? (
                <Button variant="primary" size="sm" onClick={onInvite}>
                  {inviteLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <RowList aria-label={title} divided className="w-full">
            {members.map((member) => (
              <RowList.Item
                key={member.id}
                leading={<Avatar src={member.src} name={member.name} size="md" />}
                title={member.name}
                meta={member.email ? `${member.role} · ${member.email}` : member.role}
                trailing={
                  onRemove ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-remove=""
                      onClick={(event) => {
                        focusNeighbour(event.currentTarget, "[data-remove]");
                        onRemove(member.id);
                      }}
                      aria-label={removeLabel(member.name)}
                    >
                      Remove
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </RowList>
        )}
      </VStack>
    </Card>
  );
}
