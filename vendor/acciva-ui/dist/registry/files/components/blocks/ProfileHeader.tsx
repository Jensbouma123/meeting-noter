import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeVariant } from "@/components/ui/Badge/index";
import { Card } from "@/components/ui/Card/index";
import { Grid } from "@/components/ui/Grid/index";
import { HStack } from "@/components/ui/HStack";
import { Heading } from "@/components/ui/Heading/index";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface ProfileStat {
  label: string;
  value: string;
}

export interface ProfileBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface ProfileHeaderProps {
  name: string;
  /** Role, handle or location line under the name. */
  subtitle?: string;
  avatarSrc?: string;
  bio?: string;
  badges?: ProfileBadge[];
  /** Up to four label/value counters ("Followers" / "1.2k"). */
  stats?: ProfileStat[];
  /** Action slot (Follow, Message, Edit profile buttons). */
  actions?: ReactNode;
  className?: string;
}

export function ProfileHeader({
  name,
  subtitle,
  avatarSrc,
  bio,
  badges,
  stats,
  actions,
  className,
}: ProfileHeaderProps) {
  return (
    <Card padding="lg" className={cn("w-full", className)}>
      <VStack spacing="lg">
        <HStack spacing="md" align="center" className="flex-wrap">
          <Avatar src={avatarSrc} name={name} size="lg" />
          <VStack spacing="xs" className="min-w-0 flex-1">
            <Heading level={1} size="xl" truncate>
              {name}
            </Heading>
            {subtitle ? (
              <Text size="sm" variant="muted" truncate>
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          {actions ? (
            <HStack spacing="sm" className="w-full flex-wrap sm:w-auto">
              {actions}
            </HStack>
          ) : null}
        </HStack>

        {bio ? <Text size="sm">{bio}</Text> : null}

        {badges && badges.length > 0 ? (
          <HStack as="ul" spacing="sm" className="flex-wrap" aria-label="Profile tags">
            {badges.map((badge) => (
              <li key={badge.label}>
                <Badge variant={badge.variant ?? "neutral"}>{badge.label}</Badge>
              </li>
            ))}
          </HStack>
        ) : null}

        {stats && stats.length > 0 ? (
          <Grid columns={{ base: 2, sm: 4 }} spacing="md" className="border-t border-border pt-4">
            {stats.map((stat) => (
              <VStack as="dl" key={stat.label} spacing="none">
                <dt>
                  <Text as="span" size="xs" variant="muted">
                    {stat.label}
                  </Text>
                </dt>
                <dd>
                  <Text as="span" weight="semibold" size="lg">
                    {stat.value}
                  </Text>
                </dd>
              </VStack>
            ))}
          </Grid>
        ) : null}
      </VStack>
    </Card>
  );
}
