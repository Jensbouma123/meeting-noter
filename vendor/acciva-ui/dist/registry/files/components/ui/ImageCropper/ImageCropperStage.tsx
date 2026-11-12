import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { CropAspect } from "@/lib/image/index";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs/index";
import { Text } from "@/components/ui/Text";
import type { ImageCropperMessages } from "@/components/ui/ImageCropper/types";

type CropAspectSwitchProps = {
  aspect: CropAspect;
  aspectOptions: readonly CropAspect[] | undefined;
  inert: boolean;
  messages: ImageCropperMessages;
  onSelect: (key: string) => void;
  stage: ReactNode;
};

export function CropAspectSwitch({ aspect, aspectOptions, inert, messages, onSelect, stage }: CropAspectSwitchProps) {
  const options = aspectOptions && aspectOptions.length > 1 ? aspectOptions : undefined;
  if (!options) return stage;
  return (
    <Tabs value={String(aspect)} onValueChange={onSelect} size="sm">
      <TabList aria-label={messages.aspect} className="flex w-full md:w-auto">
        {options.map((option) => (
          <Tab key={String(option)} value={String(option)} disabled={inert} className="flex-1 justify-center md:flex-none">
            {messages.aspectLabel(option)}
          </Tab>
        ))}
      </TabList>
      {/* One panel for the selected tab: the only `aria-controls` that must resolve. */}
      {options.some((option) => String(option) === String(aspect)) ? (
        <TabPanel value={String(aspect)} className="mt-3">
          {stage}
        </TabPanel>
      ) : (
        <div className="mt-3">{stage}</div>
      )}
    </Tabs>
  );
}

type CropStageProps = {
  setStage: (stage: HTMLDivElement | null) => void;
  zoom: number;
  inert: boolean;
  failed: boolean;
  crop: ReactNode;
  messages: ImageCropperMessages;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function CropStage({
  setStage,
  zoom,
  inert,
  failed,
  crop,
  messages,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: CropStageProps) {
  return (
    <div
      ref={setStage}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className={cn(
        "relative h-72 w-full touch-none select-none overflow-hidden rounded-md bg-elevation-2 md:h-96",
        zoom > 1 && !inert && "cursor-grab",
      )}
    >
      {crop}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Text size="sm" variant="danger" align="center">
            {messages.error}
          </Text>
        </div>
      ) : !crop ? (
        <>
          <Skeleton variant="rectangular" className="absolute inset-0 h-full" />
          <span className="sr-only">{messages.loading}</span>
        </>
      ) : null}
    </div>
  );
}
