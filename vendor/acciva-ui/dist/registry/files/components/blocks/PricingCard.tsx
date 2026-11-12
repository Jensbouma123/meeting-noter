import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { HStack } from "@/components/ui/HStack";
import { Heading } from "@/components/ui/Heading/index";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface PricingCardProps {
  /** Plan name, rendered as the card's heading. */
  name: string;
  /** Already-formatted price ("$29", "Free"). */
  price: string;
  /** Billing cadence shown after the price ("/ month"). */
  period?: string;
  description?: string;
  features: string[];
  /** Call-to-action label. */
  ctaLabel: string;
  /** Renders the CTA as a link when set; otherwise a button driven by `onSelect`. */
  ctaHref?: string;
  onSelect?: () => void;
  /** Marks the recommended plan: emphasised surface plus a `badge`. */
  highlighted?: boolean;
  /** Short flag on the highlighted plan ("Most popular"). */
  badge?: ReactNode;
  className?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaLabel,
  ctaHref,
  onSelect,
  highlighted = false,
  badge,
  className,
}: PricingCardProps) {
  return (
    <Card
      variant={highlighted ? "elevated" : "default"}
      padding="lg"
      className={cn("h-full", highlighted && "border-primary-500 ring-1 ring-primary-500", className)}
    >
      <VStack spacing="lg" className="h-full">
        <VStack spacing="xs">
          <HStack spacing="sm" justify="between">
            <Heading level={3} size="lg">
              {name}
            </Heading>
            {highlighted && badge ? <Badge variant="primary">{badge}</Badge> : null}
          </HStack>
          {description ? (
            <Text size="sm" variant="muted">
              {description}
            </Text>
          ) : null}
        </VStack>

        <HStack spacing="xs" align="baseline">
          <Heading level={4} size="display" as="div">
            {price}
          </Heading>
          {period ? (
            <Text as="span" size="sm" variant="muted">
              {period}
            </Text>
          ) : null}
        </HStack>

        <VStack as="ul" spacing="sm" className="flex-1" aria-label={`${name} features`}>
          {features.map((feature) => (
            <HStack as="li" key={feature} spacing="sm" align="baseline">
              <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
              <Text as="span" size="sm">
                {feature}
              </Text>
            </HStack>
          ))}
        </VStack>

        <Button
          variant={highlighted ? "primary" : "outline"}
          size="lg"
          href={ctaHref}
          onClick={onSelect}
          className="w-full"
        >
          {ctaLabel}
        </Button>
      </VStack>
    </Card>
  );
}
