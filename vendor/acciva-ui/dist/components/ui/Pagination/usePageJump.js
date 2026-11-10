import { useState } from "react";
export function usePageJump(totalPages, onPageChange) {
    const [jumpInput, setJumpInput] = useState("");
    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const target = Number.parseInt(jumpInput, 10);
        if (!Number.isNaN(target)) {
            onPageChange(Math.max(1, Math.min(totalPages, target)));
            setJumpInput("");
        }
    };
    return [jumpInput, setJumpInput, handleJumpSubmit];
}
