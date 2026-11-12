import { useState } from "react";
import { parseColor, type RGBA } from "@/lib/color/formats/index";
import { Input } from "@/components/ui/Input/index";

interface ChannelInputProps {
  label: string;
  accessibleName: string;
  committed: string;
  parse: (text: string) => number | null;
  onCommit: (value: number) => void;
}

const INTEGER_TEXT = /^\d{1,3}$/;

export function integerIn(max: number) {
  return (text: string) => {
    if (!INTEGER_TEXT.test(text.trim())) return null;
    const value = Number(text.trim());
    return value <= max ? value : null;
  };
}

const DRAFT_INPUT_PROPS = { autoComplete: "off", spellCheck: false, size: "sm" } as const;

export function ChannelInput({ label, accessibleName, committed, parse, onCommit }: ChannelInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...DRAFT_INPUT_PROPS}
      label={label}
      aria-label={accessibleName}
      inputMode="numeric"
      value={draft ?? committed}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parse(event.target.value);
        if (parsed !== null) onCommit(parsed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

const TYPING_HEX = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;
const BLUR_HEX = /^#?([0-9a-f]{3,4})$/i;

export function HexInput({ committed, onCommit }: { committed: string; onCommit: (rgba: RGBA) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commitMatch = (text: string, pattern: RegExp) => {
    const match = pattern.exec(text.trim());
    const rgba = match && parseColor(`#${match[1]}`);
    if (rgba) onCommit(rgba);
  };
  return (
    <Input
      {...DRAFT_INPUT_PROPS}
      label="Hex"
      aria-label="Hex"
      value={draft ?? committed}
      onChange={(event) => {
        setDraft(event.target.value);
        commitMatch(event.target.value, TYPING_HEX);
      }}
      onBlur={(event) => {
        commitMatch(event.target.value, BLUR_HEX);
        setDraft(null);
      }}
    />
  );
}
