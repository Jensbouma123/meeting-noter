import { type Dispatch, type SetStateAction } from "react";
import type { SelectOption } from "./types.js";
export declare function useTypeahead(options: SelectOption[], open: boolean, onChange: (value: string) => void, setActiveIndex: Dispatch<SetStateAction<number>>): (key: string) => void;
