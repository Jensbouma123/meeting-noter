import { siClaude } from 'simple-icons';
import { SquareTerminal } from 'lucide-react';
import type { AssistantLogoProps } from './Assistant.types';
import { OPENAI_PATH } from './AssistantLogoPaths';

export function AssistantLogo({ id }: AssistantLogoProps) {
  const isCodex = id === 'codex';
  return (
    <svg
      viewBox="0 0 24 24"
      width={28}
      height={28}
      aria-hidden="true"
      focusable="false"
      data-testid={`assistant-logo-${id}`}
      className="shrink-0"
    >
      <path d={isCodex ? OPENAI_PATH : siClaude.path} fill={isCodex ? 'currentColor' : `#${siClaude.hex}`} />
      {id === 'claude-code' && (
        <>
          <rect x="11" y="11" width="13" height="13" rx="3.5" fill="var(--background, #fff)" />
          <SquareTerminal x="12" y="12" width="11" height="11" strokeWidth={2.2} color="currentColor" />
        </>
      )}
    </svg>
  );
}
