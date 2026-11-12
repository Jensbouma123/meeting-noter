import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { RowList } from "@/components/ui/RowList/index";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface CheckoutLineItem {
  id: string;
  name: string;
  detail?: string;
  quantity: number;
  price: string;
}

export interface CheckoutSummaryProps {
  items: readonly CheckoutLineItem[];
  title?: string;
  subtotalLabel?: string;
  subtotal?: string;
  shippingLabel?: string;
  shipping?: string;
  taxLabel?: string;
  tax?: string;
  totalLabel?: string;
  total: string;
  checkoutLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  isCheckingOut?: boolean;
  onCheckout?: () => void;
  className?: string;
}

export function CheckoutSummary({
  items,
  title = "Order summary",
  subtotalLabel = "Subtotal",
  subtotal,
  shippingLabel = "Shipping",
  shipping,
  taxLabel = "Tax",
  tax,
  totalLabel = "Total",
  total,
  checkoutLabel = "Checkout",
  emptyTitle = "Your cart is empty",
  emptyDescription = "Items you add will appear here.",
  isCheckingOut = false,
  onCheckout,
  className,
}: CheckoutSummaryProps) {
  return (
    <Card padding="md" className={cn("w-full", className)} aria-label={title}>
      <VStack spacing="md">
        <Heading level={2} size="lg">
          {title}
        </Heading>

        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="size-7" aria-hidden="true" />}
            title={emptyTitle}
            description={emptyDescription}
            size="sm"
          />
        ) : (
          <RowList aria-label={title} divided className="w-full">
            {items.map((item) => (
              <RowList.Item
                key={item.id}
                title={item.name}
                meta={item.detail ? `Qty ${item.quantity} · ${item.detail}` : `Qty ${item.quantity}`}
                trailing={
                  <Text as="span" size="sm" weight="semibold">
                    {item.price}
                  </Text>
                }
              />
            ))}
          </RowList>
        )}

        {items.length > 0 ? (
          <VStack spacing="sm" className="w-full">
            <Divider />
            <VStack as="dl" spacing="sm" className="w-full" aria-label="Price breakdown">
              {subtotal !== undefined ? (
                <HStack spacing="sm" justify="between">
                  <dt className="text-sm text-muted-foreground">{subtotalLabel}</dt>
                  <dd className="text-sm text-foreground">{subtotal}</dd>
                </HStack>
              ) : null}
              {shipping !== undefined ? (
                <HStack spacing="sm" justify="between">
                  <dt className="text-sm text-muted-foreground">{shippingLabel}</dt>
                  <dd className="text-sm text-foreground">{shipping}</dd>
                </HStack>
              ) : null}
              {tax !== undefined ? (
                <HStack spacing="sm" justify="between">
                  <dt className="text-sm text-muted-foreground">{taxLabel}</dt>
                  <dd className="text-sm text-foreground">{tax}</dd>
                </HStack>
              ) : null}
              <HStack spacing="sm" justify="between" className="pt-1">
                <dt className="text-base font-semibold text-foreground">{totalLabel}</dt>
                <dd className="text-base font-semibold text-foreground">{total}</dd>
              </HStack>
            </VStack>
          </VStack>
        ) : null}

        {onCheckout && items.length > 0 ? (
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={onCheckout}
            loading={isCheckingOut}
          >
            {checkoutLabel}
          </Button>
        ) : null}
      </VStack>
    </Card>
  );
}
