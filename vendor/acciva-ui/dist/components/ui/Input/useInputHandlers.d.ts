import type { ChangeEvent, Dispatch, FocusEvent, RefObject, SetStateAction } from "react";
import type { InputProps } from "./types.js";
/** Returns `[handleChange, handleBlur, handleClear]`. */
export declare function useInputHandlers(inputRef: RefObject<HTMLInputElement | null>, isControlled: boolean, setUncontrolledValue: Dispatch<SetStateAction<string>>, runValidation: (val: string) => string | undefined, disabled: boolean | undefined, readOnly: boolean | undefined, onChange: InputProps["onChange"], onBlur: InputProps["onBlur"], onClear: InputProps["onClear"]): readonly [(event: ChangeEvent<HTMLInputElement>) => void, (event: FocusEvent<HTMLInputElement>) => void, () => void];
