"use client";

import {
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button/index";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { SettingsSection } from "@/components/blocks/SettingsPage/SettingsPageParts";

export { SettingsSection, type SettingsSectionProps } from "@/components/blocks/SettingsPage/SettingsPageParts";

export interface SettingsPageProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onSave?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  actions?: ReactNode;
  statusMessage?: {
    type: "success" | "error" | "warning" | "info";
    text: string;
  } | null;
  className?: string;
}

export function SettingsPage({
  title,
  description,
  children,
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = "Save changes",
  cancelLabel = "Cancel",
  actions,
  statusMessage,
  className,
}: SettingsPageProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave?.(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("mx-auto w-full max-w-4xl", className)}
      aria-label={typeof title === "string" ? title : "Settings form"}
    >
      <VStack spacing="xl">
        <VStack spacing="xs">
          <Heading level={1} size="2xl">
            {title}
          </Heading>
          {description && (
            <Text size="md" variant="muted">
              {description}
            </Text>
          )}
        </VStack>

        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-lg p-3 text-sm font-medium",
              statusMessage.type === "success" && "border border-success/20 bg-success/10 text-success",
              statusMessage.type === "error" && "border border-danger/20 bg-danger/10 text-danger",
              statusMessage.type === "warning" && "border border-warning/20 bg-warning/10 text-warning",
              statusMessage.type === "info" && "border border-primary-500/20 bg-primary-500/10 text-primary-700 dark:text-primary-300",
            )}
          >
            {statusMessage.text}
          </div>
        )}

        <VStack spacing="lg" className="w-full">
          {children}
        </VStack>

        {actions !== undefined ? (
          actions
        ) : (
          (onSave || onCancel) && (
            <HStack spacing="sm" justify="trailing" className="w-full border-t border-border pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  {cancelLabel}
                </Button>
              )}
              {onSave && (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSaving}
                >
                  {saveLabel}
                </Button>
              )}
            </HStack>
          )
        )}
      </VStack>
    </form>
  );
}

SettingsPage.Section = SettingsSection;
