import { useEffect } from "react";
export function useConfirmMatchNotify(confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange) {
    useEffect(() => {
        if (confirmMode && onConfirmMatchChange) {
            const isMatched = currentPassword.length > 0 && currentPassword === currentConfirm;
            onConfirmMatchChange(isMatched);
        }
        else if (matches !== undefined && onConfirmMatchChange) {
            const isMatched = currentPassword.length > 0 && currentPassword === matches;
            onConfirmMatchChange(isMatched);
        }
    }, [confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange]);
}
