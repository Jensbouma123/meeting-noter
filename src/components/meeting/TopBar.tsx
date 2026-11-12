'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '@/lib/i18n/useT';
import type { LanguageInfo, Status } from '@/lib/meeting';
import { useMeeting } from './store';
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HStack,
  Input,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import {
  Check,
  Download,
  Eraser,
  Globe,
  MoreHorizontal,
  Pencil,
  PanelLeftOpen,
  Search,
  Share2,
  Settings,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { SpeakerStatusChip } from './SpeakerStatusChip';
import { ShortcutsHelp } from './ShortcutsHelp';
import type { ModelProgressView, ModelReadiness } from './modelReadiness';
import type { SettingsSectionId } from '@/components/settings/sections';

interface TopBarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  status: Status;
  startedAt: number | null;
  stats: { rtf: number; lagMs: number; rssMb: number } | null;
  language: LanguageInfo | null;
  /** Epoch ms the meeting was created/started; shown under the title. Falls back to `startedAt`. */
  meetingDate?: number | null;
  /** True while the session follows auto-detect (suffixes the chip with "(auto)"). */
  languageAuto: boolean;
  /** Effective language code ('auto' = detecting): highlights the picker row. */
  selectedLang: string;
  onPickLanguage: (code: string) => void;
  onOpenSettings: (section?: SettingsSectionId) => void;
  /** Speech model download/load readiness — drives the status pill when idle. */
  modelReadiness: ModelReadiness;
  /**
   * The measured percentage while the model is getting ready. `percent` is
   * `null` when the stage can't be measured — the pill then says what stage
   * it is in rather than inventing a number.
   */
  modelProgress: ModelProgressView;
  /** Clears this session's transcript (after the confirm dialog); omit to hide the action. */
  onClearTranscript?: () => void;
  /** True while recording: the action stays visible but disabled. */
  clearDisabled?: boolean;
  /** Opens the S4 share dialog; wired by MeetingView in S9. */
  onOpenShare?: () => void;
  /** Update availability is wired by MeetingView in S9. */
  updateAvailable?: boolean;
  /** Model failure attention is wired by MeetingView in S9. */
  modelFailed?: boolean;
}

const LANG_PICK_OPTIONS = [
  { value: 'auto', label: 'autoDetect' },
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
];

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatMeetingDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(
  t: (key: string) => string,
  status: Status,
  modelReadiness: ModelReadiness,
  modelProgress: ModelProgressView,
  onOpenSettings: (section?: SettingsSectionId) => void
) {
  switch (status) {
    case 'live':
      return (
        <Badge variant="success" dot size="sm">
          {t('recording')}
        </Badge>
      );
    case 'paused':
      return (
        <Badge variant="warning" dot size="sm">
          {t('paused')}
        </Badge>
      );
    case 'requesting':
      return (
        <Badge variant="warning" size="sm">
          {t('waiting')}
        </Badge>
      );
    case 'connecting':
      return (
        <Badge variant="warning" size="sm">
          {t('starting')}
        </Badge>
      );
    case 'stopping':
      return (
        <Badge variant="neutral" size="sm">
          {t('stopping')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="danger" size="sm">
          {t('recordingError')}
        </Badge>
      );
    case 'idle':
    default: {
      if (modelReadiness === 'ready') {
        return null;
      }

      // While the model is preparing, the pill carries the real percentage
      // ("Downloading model 42%" / "Initializing model 60%") rather than a
      // wordless "Downloading…" — this pill is the one status a user staring
      // at a disabled Record button is guaranteed to be looking at.
      const label =
        modelReadiness === 'failed'
          ? t('modelFailed')
          : modelProgress.stage
            ? modelProgress.label
            : modelReadiness === 'downloading' || modelReadiness === 'loading'
              ? t('modelPreparing')
              : t('modelMissing');

      const failed = modelReadiness === 'failed';
      return (
        <Button
          variant={failed ? 'danger' : 'secondary'}
          size="xs"
          onClick={() => onOpenSettings('advanced')}
          tooltip={t('openAdvanced')}
          leadingIcon={
            failed ? <TriangleAlert className="size-3.5" /> : <Download className="size-3.5" />
          }
        >
          {label}
        </Button>
      );
    }
  }
}

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
  const [clearOpen, setClearOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [now, setNow] = useState(() => Date.now());
  const titleInputRef = useRef<HTMLInputElement>(null);

  const diarization = useMeeting((s) => s.diarization);
  const dateMs = meetingDate ?? startedAt;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  // Live timer interval
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

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    const finalTitle = trimmed.length > 0 ? trimmed : t('titleUntitled');
    setTitleDraft(finalTitle);
    onTitleChange(finalTitle);
    setIsEditingTitle(false);
  }, [titleDraft, onTitleChange, t]);

  const cancelTitleEdit = useCallback(() => {
    setTitleDraft(title);
    setIsEditingTitle(false);
  }, [title]);

  return (
    <>
    <HStack
      as="header"
      spacing="sm"
      justify="between"
      align="center"
      data-testid="meeting-topbar"
      className="h-auto min-h-14 box-border w-full max-w-full shrink-0 select-none overflow-hidden border-b border-border-subtle bg-surface/70 px-2 py-1 backdrop-blur-md sm:h-14 sm:py-0 sm:px-6 max-sm:flex-wrap max-sm:gap-x-1 max-sm:gap-y-1"
    >
      {/* Left: Meeting title (editable) */}
      <HStack spacing="xs" className="min-w-0 flex-1 overflow-hidden max-sm:basis-full">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('showMeetings')}
          leadingIcon={<PanelLeftOpen className="size-4" />}
          className="touch-target-44 shrink-0 lg:hidden"
          onClick={() => window.dispatchEvent(new Event('mn:open-sessions'))}
        />
        <h1 className="sr-only">{title}</h1>

        {isEditingTitle ? (
          <HStack spacing="xs" className="min-w-0 flex-1">
            <Input
              ref={titleInputRef}
              size="sm"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') cancelTitleEdit();
              }}
              maxLength={80}
              aria-label={t('meetingTitle')}
              className="min-w-0 flex-1 sm:max-w-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={commitTitle}
              tooltip={t('saveName')}
              leadingIcon={<Check className="size-4 text-success" />}
              className="touch-target-44 shrink-0"
            />
          </HStack>
        ) : (
          <VStack spacing="none" className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTitleDraft(title);
              setIsEditingTitle(true);
            }}
            tooltip={t('renameMeeting')}
            leadingIcon={<Pencil className="size-3 text-muted-foreground" />}
            className="group min-w-0 justify-start"
          >
            <span className="truncate text-sm font-semibold sm:text-base">
              {title}
            </span>
          </Button>
          {dateMs ? (
            <Text as="span" size="xs" variant="muted" className="truncate pl-3 leading-none">
              {formatMeetingDate(dateMs)}
            </Text>
          ) : null}
          </VStack>
        )}
      </HStack>

      {/* Center: Live timer & status pill */}
      <HStack spacing="xs" align="center" data-testid="topbar-status" className="min-w-0 shrink gap-1.5 overflow-hidden sm:shrink-0 sm:gap-3">
        {(status === 'live' || status === 'paused') && (
          <Badge variant="neutral" size="sm" className="hidden font-mono tabular-nums shadow-xs md:inline-flex">
            <span className="inline-block size-1.5 rounded-full bg-danger motion-safe:animate-pulse" />
            {formatElapsed(elapsedSeconds)}
          </Badge>
        )}

        {statusBadge(t, status, modelReadiness, modelProgress, onOpenSettings)}

        <SpeakerStatusChip status={diarization} onOpenSettings={onOpenSettings} />

        {/* Language chip: detecting/locked ASR language, tap to override. A real
            `DropdownMenu` now — the hand-rolled listbox had no focus trap, no
            Escape handling and no outside-click dismissal. */}
        {language && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Globe className="size-3" />}
                tooltip={
                  language.locked
                    ? t('languageTip').replace('{name}', language.name)
                    : t('detectingLanguage').replace('{name}', language.name)
                }
                aria-label={t('language').replace('{name}', language.name)}
                className="touch-target-44 font-medium"
              >
                <span
                  key={`${language.code}:${language.name}`}
                  className="animate-lang-crossfade whitespace-nowrap"
                >
                  <span className="sm:hidden">{language.code.toUpperCase()}</span>
                  <span className="hidden sm:inline">
                    {language.name}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>{t('spokenLanguage')}</DropdownMenuLabel>
              {LANG_PICK_OPTIONS.map((opt) => {
                const selected = selectedLang === opt.value;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onPickLanguage(opt.value)}
                    className={selected ? 'font-semibold' : undefined}
                  >
                    {opt.label === 'autoDetect' ? t(opt.label) : opt.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      </HStack>

      {/* Right: Controls */}
      <HStack spacing="xs" align="center" data-testid="topbar-actions" className="min-w-0 shrink-0 gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('showSpeakers')}
          leadingIcon={<Users className="size-4" />}
          className="touch-target-44 lg:hidden"
          onClick={() => window.dispatchEvent(new Event('mn:open-speakers'))}
        />

        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Share2 className="size-4" />}
          onClick={onOpenShare}
          className="touch-target-44"
        >
          {t('share')}
        </Button>

        {onClearTranscript && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip={t('moreActions')}
                aria-label={t('moreActions')}
                leadingIcon={<MoreHorizontal className="size-4" />}
                className="touch-target-44"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem icon={<Search className="size-4" />} onClick={() => window.dispatchEvent(new Event('mn:search'))}>
                {t('search')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                {t('shortcuts')}
              </DropdownMenuItem>
              {updateAvailable && <DropdownMenuItem onClick={() => onOpenSettings('about')}>
                {t('installUpdate')} <Badge size="sm" variant="info">{t('new')}</Badge>
              </DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" icon={<Eraser className="size-4" />} disabled={clearDisabled} onClick={() => setClearOpen(true)}>
                {t('clear')}
              </DropdownMenuItem>
              {clearDisabled && (
                <Text size="xs" variant="muted" className="px-2 py-1">
                  {t('stopBeforeClear')}
                </Text>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onOpenSettings()}
          tooltip={t('settings')}
          leadingIcon={<span className="relative"><Settings className="size-4" />{(updateAvailable || modelFailed) && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" aria-label={t('new')} />}</span>}
          className="touch-target-44"
        />
      </HStack>
    </HStack>
      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setClearOpen(false);
          onClearTranscript?.();
        }}
        variant="danger"
        title={t('clearConfirmTitle')}
        description={t('clearConfirmDescription')}
        confirmText={t('clear')}
        cancelText={t('cancel')}
      />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
