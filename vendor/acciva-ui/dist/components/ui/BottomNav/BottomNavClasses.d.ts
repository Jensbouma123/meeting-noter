import type { BottomNavHideAt, BottomNavPosition } from "./BottomNavTypes.js";
export declare const MAX_ITEMS = 5;
export declare const POSITION_CLASSES: Record<BottomNavPosition, string>;
export declare const HIDE_AT_CLASSES: Record<BottomNavHideAt, string>;
export declare const ITEM_CLASS = "focus-ring flex h-full w-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors motion-feedback active:scale-99 [&_svg]:size-6 [&_svg]:shrink-0";
export declare const LABEL_CLASS = "min-w-0 max-w-full truncate max-[22.5rem]:sr-only";
