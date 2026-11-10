import { type KeyboardEvent } from "react";
export declare function useAccordionKeyboard(): {
    containerRef: import("react").RefObject<HTMLDivElement | null>;
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};
