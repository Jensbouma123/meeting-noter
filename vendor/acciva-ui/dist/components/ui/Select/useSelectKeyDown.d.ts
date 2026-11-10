import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import type { SelectOption } from "./types.js";
export declare function useSelectKeyDown(options: SelectOption[], disabled: boolean, open: boolean, activeIndex: number, setActiveIndex: Dispatch<SetStateAction<number>>, setOpen: (open: boolean) => void, openList: () => void, commit: (index: number) => void, onChange: (value: string) => void): (event: KeyboardEvent<HTMLButtonElement>) => void;
