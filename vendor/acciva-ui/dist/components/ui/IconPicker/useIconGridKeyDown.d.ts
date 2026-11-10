import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
/** Arrow/Home/End roving focus across the listbox; Enter/Space commit the focused option; Escape closes. */
export declare function useIconGridKeyDown(gridRef: RefObject<HTMLDivElement | null>, filtered: readonly {
    name: string;
}[], setActiveIndex: Dispatch<SetStateAction<number>>, commit: (iconName: string) => void, closeAndFocusTrigger: () => void): (event: KeyboardEvent<HTMLDivElement>) => void;
