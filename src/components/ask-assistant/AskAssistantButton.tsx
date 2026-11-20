'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Tooltip } from '@jensbouma123/acciva-ui';
import { AssistantLogo } from '@/components/settings/AssistantLogo';
import { presetInstruction } from '@/lib/ask-assistant';
import { useT } from '@/lib/i18n/useT';
import { AskAssistantMenu } from './AskAssistantMenu';
import { CustomQuestionDialog } from './CustomQuestionDialog';
import { SEGMENT_CLASS } from './askAssistantStyles';
import { useAskAssistant } from './useAskAssistant';
import type { AskAssistantButtonProps } from './AskAssistantButton.types';

export function AskAssistantButton({ onOpenSettings, ...input }: AskAssistantButtonProps) {
  const t = useT('ask');
  const { assistant, configured, language, hasTranscript, ask } = useAskAssistant(input);
  const [customOpen, setCustomOpen] = useState(false);
  const name = assistant?.name ?? '';
  const fill = (message: string) => message.replace('{name}', name);
  const label = assistant ? fill(t('ask')) : t('askNone');
  const tip = !assistant ? t('setupTip') : hasTranscript ? fill(t('askTip')) : t('noTranscript');

  return (
    <div className="inline-flex shrink-0 items-center">
      <Tooltip content={tip}>
        <span className="inline-flex">
          <button
            type="button"
            disabled={!configured.loaded || (assistant !== null && !hasTranscript)}
            aria-label={label}
            onClick={() => (assistant ? void ask(presetInstruction('all', language)) : onOpenSettings())}
            className={`${SEGMENT_CLASS} rounded-l-full pr-2 pl-3 text-sm font-medium`}
          >
            {assistant ? (
              <AssistantLogo id={assistant.id} size={20} />
            ) : (
              <Bot className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{label}</span>
          </button>
        </span>
      </Tooltip>
      <AskAssistantMenu
        assistantId={assistant?.id ?? null}
        configuredIds={configured.ids}
        loaded={configured.loaded}
        hasTranscript={hasTranscript}
        onPreset={(preset) => void ask(presetInstruction(preset, language))}
        onCustom={() => setCustomOpen(true)}
        onOpenSettings={onOpenSettings}
      />
      <CustomQuestionDialog
        open={customOpen}
        assistantName={name}
        onClose={() => setCustomOpen(false)}
        onSubmit={(question) => {
          setCustomOpen(false);
          void ask(question);
        }}
      />
    </div>
  );
}
