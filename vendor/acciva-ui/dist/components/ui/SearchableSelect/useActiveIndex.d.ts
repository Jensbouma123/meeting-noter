import type { SearchableSelectOption } from "./types.js";
export declare function firstEnabledIndex(list: readonly SearchableSelectOption[]): number;
/** Tracks the highlighted option, re-seeding it when the list opens or the filtered list / value changes. */
export declare function useActiveIndex(open: boolean, filteredOptions: readonly SearchableSelectOption[], value: string | null): readonly [number, import("react").Dispatch<import("react").SetStateAction<number>>, (delta: number) => void];
