import { jsx as _jsx } from "react/jsx-runtime";
import { InputMessages } from "./InputParts.js";
// Hint, error and character counter under the field; renders nothing when none of them applies.
export function InputFooter({ hint, error, showCharCount, charCountId, ...rest }) {
    if (!hint && !error && !showCharCount)
        return null;
    return _jsx(InputMessages, { hint: hint, error: error, charCountId: showCharCount ? charCountId : undefined, ...rest });
}
