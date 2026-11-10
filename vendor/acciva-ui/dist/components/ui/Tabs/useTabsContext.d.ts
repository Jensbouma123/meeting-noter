import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { TabsOrientation, TabsVariant } from "./types.js";
interface TabsContextValue {
    value: string;
    setValue: (value: string) => void;
    baseId: string;
    size: ResponsiveSize<SizeTier>;
    variant: TabsVariant;
    orientation: TabsOrientation;
    draggable: boolean;
}
export declare const TabsContext: import("react").Context<TabsContextValue | null>;
export declare function useTabsContext(component: string): TabsContextValue;
export {};
