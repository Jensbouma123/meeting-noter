import type { InputProps } from "./types.js";
type P = InputProps;
/** Returns `[isControlled, currentValue, setUncontrolledValue, internalError, runValidation]`. */
export declare function useInputValue(value: P["value"], defaultValue: P["defaultValue"], validate: P["validate"], minLength: P["minLength"], type: string, min: P["min"], max: P["max"], step: P["step"]): readonly [boolean, string, import("react").Dispatch<import("react").SetStateAction<string>>, string | undefined, (val: string) => string | undefined];
export {};
