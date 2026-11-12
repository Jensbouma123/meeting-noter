"use client";

import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/index";
import { Drawer } from "@/components/ui/Drawer/index";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";

export interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// A right-edge `Drawer` (native `<dialog>`: top layer, inert page, focus containment,
// Escape/light dismiss, scroll lock, focus return, slide enter/exit) with a titled body.
// Not draggable by design.
export function SettingsSheet({ open, onClose, title, children }: SettingsSheetProps) {
  const titleId = useId();

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      side="right"
      swipeToDismiss={false}
      aria-labelledby={titleId}
      className="h-full rounded-none"
    >
      <VStack spacing="lg" className="h-full w-full p-4 sm:p-6">
        <HStack spacing="none" justify="between">
          <Heading level={2} id={titleId}>
            {title}
          </Heading>
          <Button
            iconOnly
            variant="ghost"
            tooltip="Close settings"
            onClick={onClose}
            data-dialog-close
            leadingIcon={<X className="size-5" />}
          />
        </HStack>
        <VStack spacing="xl">{children}</VStack>
      </VStack>
    </Drawer>
  );
}
