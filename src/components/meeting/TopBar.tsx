'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n/useT';
import { useMeeting } from './store';
import { Badge, HStack } from '@jensbouma123/acciva-ui';
import { SpeakerStatusChip } from './SpeakerStatusChip';
import { TopBarActions } from './TopBarActions';
import { TopBarLanguagePicker } from './TopBarLanguagePicker';
import { TopBarStatusBadge } from './TopBarStatusBadge';
import { TopBarTitle } from './TopBarTitle';
import { formatElapsed } from './topBarFormat';
import type { TopBarProps } from './TopBar.types';

export function TopBar({
  title,
  onTitleChange,
  status,
  startedAt,
  meetingDate,
  language,
  selectedLang,
  onPickLanguage,
  onOpenSettings,
  modelReadiness,
  modelProgress,
  onClearTranscript,
  clearDisabled = false,
  onOpenShare,
  updateAvailable = false,
  modelFailed = false,
}: TopBarProps) {
  const t = useT('topbar');
  const [now, setNow] = useState(() => Date.now());

  const diarization = useMeeting((s) => s.diarization);

  useEffect(() => {
    if (status !== 'live') return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const elapsedSeconds =
    (status === 'live' || status === 'paused') && startedAt
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : 0;

  return (
    <HStack
      as="header"
      spacing="sm"
      justify="between"
      align="center"
      data-testid="meeting-topbar"
      className="h-auto min-h-14 box-border w-full max-w-full shrink-0 select-none overflow-hidden border-b border-border-subtle bg-surface/70 px-2 py-1 backdrop-blur-md sm:h-14 sm:py-0 sm:px-6 max-sm:flex-wrap max-sm:gap-x-1 max-sm:gap-y-1"
    >
      <TopBarTitle title={title} dateMs={meetingDate ?? startedAt} onTitleChange={onTitleChange} />

      <HStack spacing="xs" align="center" data-testid="topbar-status" className="min-w-0 shrink gap-1.5 overflow-hidden sm:shrink-0 sm:gap-3">
        {(status === 'live' || status === 'paused') && (
          <Badge variant="neutral" size="sm" className="hidden font-mono tabular-nums shadow-xs md:inline-flex">
            <span className="inline-block size-1.5 rounded-full bg-danger motion-safe:animate-pulse" />
            {formatElapsed(elapsedSeconds)}
          </Badge>
        )}

        <TopBarStatusBadge
          t={t}
          status={status}
          modelReadiness={modelReadiness}
          modelProgress={modelProgress}
          onOpenSettings={onOpenSettings}
        />

        <SpeakerStatusChip status={diarization} onOpenSettings={onOpenSettings} />

        {language && (
          <TopBarLanguagePicker
            language={language}
            selectedLang={selectedLang}
            onPickLanguage={onPickLanguage}
          />
        )}
      </HStack>

      <TopBarActions
        onOpenSettings={onOpenSettings}
        onClearTranscript={onClearTranscript}
        clearDisabled={clearDisabled}
        onOpenShare={onOpenShare}
        updateAvailable={updateAvailable}
        modelFailed={modelFailed}
      />
    </HStack>
  );
}
