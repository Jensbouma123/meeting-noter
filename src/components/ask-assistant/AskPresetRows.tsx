'use client';

import { FileCheck, FileClock, FilePen, FileQuestion, Files, FileText, type LucideIcon } from 'lucide-react';
import { ASK_PRESET_IDS, type AskPresetId } from '@/lib/ask-assistant';
import { useT } from '@/lib/i18n/useT';
import { AskMenuRow } from './AskMenuRow';
import type { AskPresetRowsProps } from './AskPresetRows.types';

const PRESET_ICONS: Record<AskPresetId, LucideIcon> = {
  summary: FileText,
  decisions: FileCheck,
  actions: FileClock,
  all: Files,
  cleanup: FilePen,
};

export function AskPresetRows({ hasTranscript, onPreset, onCustom }: AskPresetRowsProps) {
  const t = useT('ask');
  return (
    <>
      {ASK_PRESET_IDS.map((preset) => {
        const Icon = PRESET_ICONS[preset];
        return (
          <AskMenuRow
            key={preset}
            icon={<Icon className="size-4" />}
            title={t(`preset.${preset}`)}
            hint={t(`presetHint.${preset}`)}
            disabled={!hasTranscript}
            onClick={() => onPreset(preset)}
          />
        );
      })}
      <AskMenuRow
        icon={<FileQuestion className="size-4" />}
        title={t('preset.custom')}
        hint={t('presetHint.custom')}
        disabled={!hasTranscript}
        onClick={onCustom}
      />
    </>
  );
}
