import { type ReactNode } from "react";
import { Card, type CardVariant } from "@/components/ui/Card/index";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface SettingsSectionProps {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  variant?: CardVariant;
  className?: string;
}

export function SettingsSection({
  id,
  title,
  description,
  children,
  actions,
  variant = "default",
  className,
}: SettingsSectionProps) {
  return (
    <Card id={id} variant={variant} className={cn("w-full p-4 sm:p-6", className)}>
      <VStack spacing="lg">
        <HStack justify="between" align="leading" wrap>
          <VStack spacing="xs">
            <Heading level={2} size="lg">
              {title}
            </Heading>
            {description && (
              <Text size="sm" variant="muted">
                {description}
              </Text>
            )}
          </VStack>
          {actions && <div>{actions}</div>}
        </HStack>

        <VStack spacing="md" className="w-full">
          {children}
        </VStack>
      </VStack>
    </Card>
  );
}
