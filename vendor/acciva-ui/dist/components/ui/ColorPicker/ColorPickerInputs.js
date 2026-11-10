import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { parseColor } from "../../../lib/color/formats/index.js";
import { Input } from "../Input/index.js";
const INTEGER_TEXT = /^\d{1,3}$/;
export function integerIn(max) {
    return (text) => {
        if (!INTEGER_TEXT.test(text.trim()))
            return null;
        const value = Number(text.trim());
        return value <= max ? value : null;
    };
}
const DRAFT_INPUT_PROPS = { autoComplete: "off", spellCheck: false, size: "sm" };
export function ChannelInput({ label, accessibleName, committed, parse, onCommit }) {
    const [draft, setDraft] = useState(null);
    return (_jsx(Input, { ...DRAFT_INPUT_PROPS, label: label, "aria-label": accessibleName, inputMode: "numeric", value: draft ?? committed, onChange: (event) => {
            setDraft(event.target.value);
            const parsed = parse(event.target.value);
            if (parsed !== null)
                onCommit(parsed);
        }, onBlur: () => setDraft(null) }));
}
const TYPING_HEX = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;
const BLUR_HEX = /^#?([0-9a-f]{3,4})$/i;
export function HexInput({ committed, onCommit }) {
    const [draft, setDraft] = useState(null);
    const commitMatch = (text, pattern) => {
        const match = pattern.exec(text.trim());
        const rgba = match && parseColor(`#${match[1]}`);
        if (rgba)
            onCommit(rgba);
    };
    return (_jsx(Input, { ...DRAFT_INPUT_PROPS, label: "Hex", "aria-label": "Hex", value: draft ?? committed, onChange: (event) => {
            setDraft(event.target.value);
            commitMatch(event.target.value, TYPING_HEX);
        }, onBlur: (event) => {
            commitMatch(event.target.value, BLUR_HEX);
            setDraft(null);
        } }));
}
