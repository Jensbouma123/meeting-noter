import type { AskAssistantId } from '@/lib/ask-assistant';
import type { AssistantLogoProps } from './AssistantLogo.types';

const MARKS: Record<AskAssistantId, { letter: string; color: string }> = {
  claude: { letter: 'C', color: '#d97757' },
  chatgpt: { letter: 'G', color: '#10a37f' },
  gemini: { letter: 'G', color: '#4285f4' },
  copilot: { letter: 'C', color: '#0078d4' },
  perplexity: { letter: 'P', color: '#20808d' },
  mistral: { letter: 'M', color: '#fa520f' },
};

export function AssistantLogo({ id, className = 'size-5' }: AssistantLogoProps) {
  const mark = MARKS[id];
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="10" fill={mark.color} />
      <text
        x="10"
        y="10"
        dy="0.35em"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill="#fff"
      >
        {mark.letter}
      </text>
    </svg>
  );
}
