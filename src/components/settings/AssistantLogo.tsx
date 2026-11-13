import type { AssistantLogoProps } from './Assistant.types';

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);
const PETALS = Array.from({ length: 6 }, (_, i) => i * 60);

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
      fill="none"
      strokeLinecap="round"
    >
      {isCodex
        ? PETALS.map((r) => (
            <rect key={r} x="9.2" y="2.5" width="5.6" height="9.5" rx="2.8" stroke="currentColor" strokeWidth="1.6" transform={`rotate(${r} 12 12)`} />
          ))
        : RAYS.map((r, i) => (
            <line key={r} x1="12" y1={i % 2 ? 6 : 3} x2="12" y2="10" stroke="#D97757" strokeWidth="2.2" transform={`rotate(${r} 12 12)`} />
          ))}
    </svg>
  );
}
