import { useState, type FormEvent } from "react";

export function usePageJump(totalPages: number, onPageChange: (page: number) => void) {
  const [jumpInput, setJumpInput] = useState("");

  const handleJumpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = Number.parseInt(jumpInput, 10);
    if (!Number.isNaN(target)) {
      onPageChange(Math.max(1, Math.min(totalPages, target)));
      setJumpInput("");
    }
  };

  return [jumpInput, setJumpInput, handleJumpSubmit] as const;
}
