import { jsx as _jsx } from "react/jsx-runtime";
import { ArrowHint } from "../../../lib/ArrowHint.js";
export function DataListArrowHint({ hint }) {
    return _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: hint.visible });
}
