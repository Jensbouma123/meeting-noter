import { type KeyboardEvent } from "react";
export declare function useToastRegion(hotkey: string): {
    rootRef: import("react").RefObject<HTMLDivElement | null>;
    handleRegionKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};
