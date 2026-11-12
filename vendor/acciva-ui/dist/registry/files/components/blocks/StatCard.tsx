import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card/index";
import { Grid } from "@/components/ui/Grid/index";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { ICON_SIZE_CLASS } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export type StatCardTone = "primary" | "secondary" | "accent" | "success";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  delta?: number;
  deltaLabel?: string;
  /**
   * Static qualifier for the value ("34 gated pairs verified"), rendered muted below it. It is
   * not a trend: `delta` owns direction and keeps its own success/danger colour, so a footnote
   * never competes with it for the same signal (SC 1.4.1).
   */
  footnote?: ReactNode;
}

// Tone colours only the icon chip — never the value or the delta, so a tone can never be
// mistaken for a trend signal (SC 1.4.1). Each pairing is a `-100` fill under `-700` text,
// a ramp that is mode-independent by design and so needs no dark-mode override.
const TONE_ICON_CHIP: Record<StatCardTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-success-100 text-success-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  delta,
  deltaLabel,
  footnote,
}: StatCardProps) {
  const trendingUp = (delta ?? 0) >= 0;

  return (
    <Card padding="md">
      <VStack spacing="md">
        <HStack spacing="none" justify="between">
          <Text as="span" size="sm" weight="medium" variant="muted">
            {label}
          </Text>
          <span className={cn("flex size-9 items-center justify-center rounded-lg", TONE_ICON_CHIP[tone])}>
            <Icon className={ICON_SIZE_CLASS.lg} />
          </span>
        </HStack>
        <VStack spacing="xs">
          <HStack spacing="sm" align="trailing" justify="between">
            <Heading as="span" size="2xl" weight="semibold">
              {value}
            </Heading>
            {delta !== undefined ? (
              <HStack
                as="span"
                spacing="xs"
                align="center"
                className={cn("mb-1 text-xs font-medium", trendingUp ? "text-success" : "text-danger")}
              >
                {trendingUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(delta)}%{deltaLabel ? ` ${deltaLabel}` : ""}
              </HStack>
            ) : null}
          </HStack>
          {footnote !== undefined ? (
            <Text as="span" size="xs" variant="muted">
              {footnote}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Card>
  );
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return (
    <Grid columns={{ base: 1, sm: 2, xl: 4 }} spacing="lg">
      {children}
    </Grid>
  );
}
