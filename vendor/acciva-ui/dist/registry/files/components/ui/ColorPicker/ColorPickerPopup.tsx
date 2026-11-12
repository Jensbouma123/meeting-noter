import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/Button/index";
import { Drawer } from "@/components/ui/Drawer/index";
import { Popover } from "@/components/ui/Popover/index";
import { VStack } from "@/components/ui/VStack";
import { PANEL_TITLE } from "@/components/ui/ColorPicker/colorPickerUtils";

interface ColorPickerPopupProps {
  surface: "popover" | "drawer" | null;
  panel: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function ColorPickerPopup({ surface, panel, triggerRef, onClose }: ColorPickerPopupProps) {
  return (
    <>
      <Popover
        open={surface === "popover"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        anchorRef={triggerRef}
        placement="bottom"
        dismissOnOutsideClick
        title={PANEL_TITLE}
        content={panel}
      />

      <Drawer
        open={surface === "drawer"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        side="bottom"
        modality="modal"
        aria-label={PANEL_TITLE}
      >
        {surface === "drawer" ? (
          <VStack spacing="md" className="px-4 pb-4">
            {panel}
            <Button variant="primary" size="lg" className="w-full justify-center" onClick={onClose}>
              Done
            </Button>
          </VStack>
        ) : null}
      </Drawer>
    </>
  );
}
