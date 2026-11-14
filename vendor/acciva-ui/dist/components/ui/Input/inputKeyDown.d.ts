import type { KeyboardEvent } from "react";
import type { InputProps } from "./types.js";
export declare function createInputKeyDown(onKeyDown: InputProps["onKeyDown"], searchClearable: boolean, hasValue: boolean, onClear: () => void): (event: KeyboardEvent<HTMLInputElement>) => void;
