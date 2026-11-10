import { type MouseEvent, type PointerEvent } from "react";
/** Hold time before a touch/pen press counts as a long-press (mirrors the 0.5s Apple duration). */
export declare const LONG_PRESS_MS = 500;
/**
 * Touch/pen long-press (WCAG 2.2 SC 2.5.1: never the only path; SC 2.5.2: release without a
 * click once it fired). Mouse and keyboard never arm it. The handlers are spread onto the
 * trigger; `consumeClick()` returns true once to drop the click that follows a fired press.
 */
export declare function useLongPress(enabled: boolean, onLongPress: () => void, onRelease?: () => void): {
    onPointerDown: (e: PointerEvent<Element>) => void;
    onPointerMove: (e: PointerEvent<Element>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (e: MouseEvent<Element>) => void;
    consumeClick: () => boolean;
};
