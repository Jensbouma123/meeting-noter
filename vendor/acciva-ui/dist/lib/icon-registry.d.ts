import type { LucideIcon } from "lucide-react";
export type IconCategory = "Navigation" | "Interface" | "Communication" | "Media" | "Files" | "Commerce" | "Weather & Nature" | "Travel" | "Development" | "Charts & Data" | "People" | "Security" | "Devices" | "Emotion" | "Misc";
export declare const ICON_CATEGORIES: Record<IconCategory, string[]>;
export declare function getIconComponent(name: string): LucideIcon | undefined;
export declare const ALL_ICON_NAMES: {
    name: string;
    category: IconCategory;
}[];
export declare function toPascalName(name: string): string;
export declare function toKebabName(name: string): string;
