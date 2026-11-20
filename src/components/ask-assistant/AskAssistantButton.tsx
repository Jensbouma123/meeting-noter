'use client';

import { useState } from 'react';
import { Tooltip } from '@jensbouma123/acciva-ui';
import { presetInstruction } from '@/lib/ask-assistant';
import { useT } from '@/lib/i18n/useT';
import { AskAssistantMenu } from './AskAssistantMenu';
import { AssistantLogo } from './AssistantLogo';
import { CustomQuestionDialog } from './CustomQuestionDialog';
import { SEGMENT_CLASS } from './askAssistantStyles';
import { useAskAssistant } from './useAskAssistant';
import type { AskAssistantButtonProps } from './AskAssistantButton.types';

export function AskAssistantButton(props: AskAssistantButtonProps) {
  const t = useT('ask');
  const { assistant, language, hasTranscript, ask } = useAskAssistant(props);
  const [customOpen, setCustomOpen] = useState(false);
  const fill = (message: string) => message.replace('{name}', assistant.name);

  return (
    <div className="inline-flex shrink-0 items-center">
      <Tooltip content={hasTranscript ? fill(t('askTip')) : t('noTranscript')}>
        <span className="inline-flex">
          <button
            type="button"
            disabled={!hasTranscript}
            aria-label={fill(t('ask'))}
            onClick={() => void ask(presetInstruction('all', language))}
            className={`${SEGMENT_CLASS} rounded-l-full pr-2 pl-3 text-sm font-medium`}
          >
            <AssistantLogo id={assistant.id} />
            <span className="hidden sm:inline">{fill(t('ask'))}</span>
          </button>
        </span>
      </Tooltip>
      <AskAssistantMenu
        assistantId={assistant.id}
        hasTranscript={hasTranscript}
        onPreset={(preset) => void ask(presetInstruction(preset, language))}
        onCustom={() => setCustomOpen(true)}
      />
      <CustomQuestionDialog
        open={customOpen}
        assistantName={assistant.name}
        onClose={() => setCustomOpen(false)}
        onSubmit={(question) => {
          setCustomOpen(false);
          void ask(question);
        }}
      />
    </div>
  );
}
