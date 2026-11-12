import { X } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { Drawer } from "@/components/ui/Drawer/index";
import { Heading } from "@/components/ui/Heading/index";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import type { ListDetailViewProps } from "@/components/blocks/ListDetailView/ListDetailViewTypes";

export interface ListDetailDrawerProps<T> {
  currentItem: T | null | undefined;
  detailTitle: ListDetailViewProps<T>["detailTitle"];
  renderDetail: ListDetailViewProps<T>["renderDetail"];
  onClose: () => void;
}

export function ListDetailDrawer<T>({ currentItem, detailTitle, renderDetail, onClose }: ListDetailDrawerProps<T>) {
  return (
    <Drawer
      open={currentItem !== null && currentItem !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      side="right"
      aria-label={
        typeof detailTitle === "string"
          ? detailTitle
          : "Detail panel"
      }
    >
      {currentItem !== null && currentItem !== undefined && (
        <VStack spacing="lg" inset="lg" className="h-full">
          <HStack justify="between" align="center" className="border-b border-border pb-4">
            <Heading level={2} size="lg">
              {typeof detailTitle === "function"
                ? detailTitle(currentItem)
                : detailTitle ?? "Details"}
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip="Close detail panel"
              onClick={() => onClose()}
              className="touch-target-44"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </HStack>
          <div
            className="flex-1 overflow-auto"
            tabIndex={0}
            role="region"
            aria-label="Detail content"
          >
            {renderDetail(currentItem, () => onClose())}
          </div>
        </VStack>
      )}
    </Drawer>
  );
}
