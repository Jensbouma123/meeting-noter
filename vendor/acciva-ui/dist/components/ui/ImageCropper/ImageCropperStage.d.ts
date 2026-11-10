import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { CropAspect } from "../../../lib/image/index.js";
import type { ImageCropperMessages } from "./types.js";
type CropAspectSwitchProps = {
    aspect: CropAspect;
    aspectOptions: readonly CropAspect[] | undefined;
    inert: boolean;
    messages: ImageCropperMessages;
    onSelect: (key: string) => void;
    stage: ReactNode;
};
export declare function CropAspectSwitch({ aspect, aspectOptions, inert, messages, onSelect, stage }: CropAspectSwitchProps): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element | null | undefined;
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
export declare function CropStage({ setStage, zoom, inert, failed, crop, messages, onPointerDown, onPointerMove, onPointerEnd, }: CropStageProps): import("react").JSX.Element;
export {};
