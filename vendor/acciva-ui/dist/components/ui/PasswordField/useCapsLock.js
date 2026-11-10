import { useState } from "react";
export function useCapsLock({ onKeyDown, onKeyUp, onBlur }) {
    const [capsLockActive, setCapsLockActive] = useState(false);
    const handleModifierState = (e) => {
        const isCaps = (typeof e.getModifierState === "function" && e.getModifierState("CapsLock")) ||
            (typeof e.nativeEvent?.getModifierState === "function" &&
                e.nativeEvent.getModifierState("CapsLock")) ||
            Boolean(e.nativeEvent?.modifierCapsLock);
        setCapsLockActive(Boolean(isCaps));
    };
    const handleKeyDown = (e) => {
        handleModifierState(e);
        onKeyDown?.(e);
    };
    const handleKeyUp = (e) => {
        handleModifierState(e);
        onKeyUp?.(e);
    };
    const handleBlur = (e) => {
        setCapsLockActive(false);
        onBlur?.(e);
    };
    return { capsLockActive, handleKeyDown, handleKeyUp, handleBlur };
}
