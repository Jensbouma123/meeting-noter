import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { HStack } from "@/components/ui/HStack";
import { Heading } from "@/components/ui/Heading/index";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled";

/** Ordered fulfilment steps; `cancelled` sits outside the timeline. */
const STEPS: { status: Exclude<OrderStatus, "cancelled">; label: string }[] = [
  { status: "placed", label: "Order placed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  placed: "neutral",
  packed: "primary",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface OrderStatusCardProps {
  /** Order reference shown in the heading ("#10482"). */
  orderId: string;
  status: OrderStatus;
  /** Already-formatted summary line ("3 items · $84.20"). */
  summary?: string;
  /** Estimated delivery or a status note ("Arrives Thu, 12 Mar"). */
  eta?: string;
  /** Action slot (Track package, Cancel order). */
  actions?: ReactNode;
  /** Convenience: renders a "Track order" link button when set and the order is not final. */
  trackHref?: string;
  className?: string;
}

export function OrderStatusCard({
  orderId,
  status,
  summary,
  eta,
  actions,
  trackHref,
  className,
}: OrderStatusCardProps) {
  const reached = STEPS.findIndex((step) => step.status === status);
  const showTrack = trackHref && status !== "delivered" && status !== "cancelled";

  return (
    <Card padding="lg" className={cn("w-full max-w-md", className)}>
      <VStack spacing="lg">
        <HStack spacing="sm" justify="between">
          <VStack spacing="xs" className="min-w-0">
            <Heading level={3} size="lg">
              Order {orderId}
            </Heading>
            {summary ? (
              <Text size="sm" variant="muted">
                {summary}
              </Text>
            ) : null}
          </VStack>
          <Badge variant={STATUS_TONE[status]} dot>
            {STATUS_LABEL[status]}
          </Badge>
        </HStack>

        {status !== "cancelled" ? (
          <VStack as="ol" spacing="sm" aria-label="Order progress">
            {STEPS.map((step, index) => {
              const done = index <= reached;
              return (
                <HStack
                  as="li"
                  key={step.status}
                  spacing="sm"
                  aria-current={index === reached ? "step" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      done
                        ? "border-success bg-success text-success-foreground"
                        : "border-border text-transparent",
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                  <Text as="span" size="sm" variant={done ? "default" : "muted"}>
                    {step.label}
                    {done ? <span className="sr-only"> (complete)</span> : null}
                  </Text>
                </HStack>
              );
            })}
          </VStack>
        ) : null}

        {eta ? (
          <Text size="sm" weight="medium">
            {eta}
          </Text>
        ) : null}

        {actions || showTrack ? (
          <HStack spacing="sm" className="flex-wrap">
            {showTrack ? (
              <Button href={trackHref} variant="outline">
                Track order
              </Button>
            ) : null}
            {actions}
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );
}
