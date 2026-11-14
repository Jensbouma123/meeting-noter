import type { ComboboxItem } from "./types.js";
export declare function firstEnabledIndex(list: readonly ComboboxItem[]): number;
/** Tracks the highlighted option, re-seeding it when the list opens or the filtered list / value changes. */
export declare function useActiveIndex<T extends ComboboxItem>(open: boolean, filteredOptions: readonly T[], value: string | null): readonly [number, import("react").Dispatch<import("react").SetStateAction<number>>, (delta: number) => void];
