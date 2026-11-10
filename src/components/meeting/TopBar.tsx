'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { LanguageInfo, Segment, Speaker, Status } from '@/lib/meeting';
import { useMeeting } from './store';
import {
  EXPORT_FORMATS,
  copyToClipboard,
  downloadFile,
  exportFilename,
  finalSegments,
  formatExport,
  formatMeta,
  resolveSpeakerLabel,
  type ExportFormat,
} from '@/lib/meeting/export';
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
  Tooltip,
  useToast,
  VStack,
} from '@jensbouma123/acciva-ui';
import {
  Check,
  Copy,
  Download,
  Eraser,
  Globe,
  MoreHorizontal,
  Pencil,
  PanelLeftOpen,
  Settings,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { SpeakerStatusChip } from './SpeakerStatusChip';
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
  /** Final-segment source for export; falls back to the live store when omitted. */
  segments?: Segment[];
  speakers?: Record<string, Speaker>;
  /** Clears this session's transcript (after the confirm dialog); omit to hide the action. */
  onClearTranscript?: () => void;
  /** True while recording: the action stays visible but disabled. */
  clearDisabled?: boolean;
}

const LANG_PICK_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
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
  status: Status,
  modelReadiness: ModelReadiness,
  modelProgress: ModelProgressView,
  onOpenSettings: (section?: SettingsSectionId) => void
) {
  switch (status) {
    case 'live':
      return (
        <Badge variant="success" dot size="sm">
          Recording
        </Badge>
      );
    case 'paused':
      return (
        <Badge variant="warning" dot size="sm">
          Paused
        </Badge>
      );
    case 'requesting':
      return (
        <Badge variant="warning" size="sm">
          Waiting for mic access…
        </Badge>
      );
    case 'connecting':
      return (
        <Badge variant="warning" size="sm">
          Starting…
        </Badge>
      );
    case 'stopping':
      return (
        <Badge variant="neutral" size="sm">
          Stopping…
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="danger" size="sm">
          Recording error
        </Badge>
      );
    case 'idle':
    default: {
      if (modelReadiness === 'ready') {
        return (
          <Badge variant="neutral" size="sm">
            Ready
          </Badge>
        );
      }

      // While the model is preparing, the pill carries the real percentage
      // ("Downloading model 42%" / "Initializing model 60%") rather than a
      // wordless "Downloading…" — this pill is the one status a user staring
      // at a disabled Record button is guaranteed to be looking at.
      const label =
        modelReadiness === 'failed'
          ? 'Speech model error'
          : modelProgress.stage
            ? modelProgress.label
            : modelReadiness === 'downloading' || modelReadiness === 'loading'
              ? 'Preparing speech model…'
              : 'Download speech model';

      const failed = modelReadiness === 'failed';
      return (
        <Button
          variant={failed ? 'danger' : 'secondary'}
          size="xs"
          onClick={() => onOpenSettings('speech-model')}
          tooltip="Open speech model settings"
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
  stats,
  language,
  languageAuto,
  selectedLang,
  onPickLanguage,
  onOpenSettings,
  modelReadiness,
  modelProgress,
  segments: segmentsProp,
  speakers: speakersProp,
  onClearTranscript,
  clearDisabled = false,
}: TopBarProps) {
  const [clearOpen, setClearOpen] = useState(false);
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [now, setNow] = useState(() => Date.now());
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Export reads the live transcript; explicit props win (tests / embedding),
  // otherwise fall back to the store so no caller wiring is required.
  const storeSegments = useMeeting((s) => s.segments);
  const storeSpeakers = useMeeting((s) => s.speakers);
  const callAudioMissing = useMeeting((s) => s.callAudioMissing);
  const diarization = useMeeting((s) => s.diarization);
  const segments = segmentsProp ?? storeSegments;
  const speakers = speakersProp ?? storeSpeakers;
  const exportableCount = finalSegments(segments).length;
  const dateMs = meetingDate ?? startedAt;
  const [exportOpen, setExportOpen] = useState(false);

  // Cover every speaker id in the transcript so the formatter never prints a raw id.
  const exportSpeakers = useMemo(() => {
    const map = { ...speakers };
    for (const seg of segments) {
      if (!map[seg.speaker]) {
        map[seg.speaker] = {
          id: seg.speaker,
          source: seg.source,
          label: resolveSpeakerLabel(seg, {}, callAudioMissing),
          colorIndex: 0,
        };
      }
    }
    return map;
  }, [segments, speakers, callAudioMissing]);
  const exportOptions = useMemo(
    () => ({ callAudioMissing, startedAt }),
    [callAudioMissing, startedAt]
  );

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

  // Keyboard-shortcut contract: the global handler dispatches 'mn:export',
  // which the export menu below listens for.
  useEffect(() => {
    const handler = () => setExportOpen(true);
    window.addEventListener('mn:export', handler);
    return () => window.removeEventListener('mn:export', handler);
  }, []);

  const elapsedSeconds =
    (status === 'live' || status === 'paused') && startedAt
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : 0;

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    const finalTitle = trimmed.length > 0 ? trimmed : 'Untitled meeting';
    setTitleDraft(finalTitle);
    onTitleChange(finalTitle);
    setIsEditingTitle(false);
  }, [titleDraft, onTitleChange]);

  const cancelTitleEdit = useCallback(() => {
    setTitleDraft(title);
    setIsEditingTitle(false);
  }, [title]);

  // Copy feedback is a toast, not a pair of `setState` timers: the menu closes
  // the instant you click, so an inline "Copied" tick was invisible anyway.
  const handleCopyExport = useCallback(
    async (format: ExportFormat) => {
      const meta = formatMeta(format);
      const ok = await copyToClipboard(
        formatExport(format, segments, exportSpeakers, title, exportOptions)
      );
      if (ok) {
        toast.success(`Copied as ${meta.label}`, {
          description: `${exportableCount} line${exportableCount === 1 ? '' : 's'} copied.`,
        });
      } else {
        toast.danger("Couldn't copy", {
          description: 'Your browser blocked the clipboard. Use Download instead.',
        });
      }
    },
    [segments, exportSpeakers, exportOptions, title, exportableCount, toast]
  );

  const handleDownloadExport = useCallback(
    (format: ExportFormat) => {
      const meta = formatMeta(format);
      downloadFile(
        exportFilename(title, meta.extension),
        formatExport(format, segments, exportSpeakers, title, exportOptions),
        meta.mime
      );
    },
    [segments, exportSpeakers, exportOptions, title]
  );

  return (
    <>
    <HStack
      as="header"
      spacing="sm"
      justify="between"
      align="center"
      data-testid="meeting-topbar"
      className="h-auto min-h-14 w-full max-w-full shrink-0 select-none overflow-hidden border-b border-border-subtle bg-surface/70 px-2 py-1 backdrop-blur-md sm:h-14 sm:py-0 sm:px-6 max-sm:flex-wrap max-sm:gap-x-1 max-sm:gap-y-1"
    >
      {/* Left: Meeting title (editable) */}
      <HStack spacing="xs" className="min-w-0 flex-1 overflow-hidden max-sm:basis-full">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip="Show meetings"
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
              aria-label="Meeting title"
              className="min-w-0 flex-1 sm:max-w-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={commitTitle}
              tooltip="Save name"
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
            tooltip="Rename meeting"
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

        {statusBadge(status, modelReadiness, modelProgress, onOpenSettings)}

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
                    ? `Language: ${language.name}`
                    : `Detecting language… (${language.name} so far)`
                }
                aria-label={`Meeting language: ${language.name}. Change language`}
                className="touch-target-44 font-medium"
              >
                <span
                  key={`${language.code}:${language.name}`}
                  className="animate-lang-crossfade whitespace-nowrap"
                >
                  <span className="sm:hidden">{language.code.toUpperCase()}</span>
                  <span className="hidden sm:inline">
                    {languageAuto ? `${language.name} (auto)` : language.name}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Spoken language</DropdownMenuLabel>
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
                    {opt.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Realtime stats if active */}
        {stats && (status === 'live' || status === 'paused') && (
          <Tooltip content="How fast transcription keeps up with speech. Lower is better.">
            <Badge variant="neutral" size="sm" className="hidden font-mono xl:inline-flex">
              {`${stats.rtf}× speed · ${stats.lagMs} ms behind`}
            </Badge>
          </Tooltip>
        )}
      </HStack>

      {/* Right: Controls */}
      <HStack spacing="xs" align="center" data-testid="topbar-actions" className="min-w-0 shrink-0 gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip="Show speakers"
          leadingIcon={<Users className="size-4" />}
          className="touch-target-44 lg:hidden"
          onClick={() => window.dispatchEvent(new Event('mn:open-speakers'))}
        />

        {/* Export menu: copy / download final segments as Markdown, TXT, SRT */}
        <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip="Export transcript (⌘/Ctrl E)"
              leadingIcon={<Download className="size-4" />}
              aria-label="Export transcript"
              className="touch-target-44"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Export transcript</DropdownMenuLabel>
            {exportableCount === 0 ? (
              <DropdownMenuItem disabled>Nothing to export yet — record first</DropdownMenuItem>
            ) : (
              EXPORT_FORMATS.map((f, i) => (
                <VStack key={f.value} spacing="none" className="w-full">
                  {i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    icon={<Download className="size-4" />}
                    onClick={() => handleDownloadExport(f.value)}
                  >
                    {`Download ${f.label} (.${f.extension})`}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    icon={<Copy className="size-4" />}
                    onClick={() => void handleCopyExport(f.value)}
                  >
                    Copy as {f.label}
                  </DropdownMenuItem>
                </VStack>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {onClearTranscript && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip="More actions"
                aria-label="More actions"
                leadingIcon={<MoreHorizontal className="size-4" />}
                className="touch-target-44"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                variant="danger"
                icon={<Eraser className="size-4" />}
                disabled={clearDisabled}
                onClick={() => setClearOpen(true)}
              >
                Clear transcript
              </DropdownMenuItem>
              {clearDisabled && (
                <Text size="xs" variant="muted" className="px-2 py-1">
                  Stop the recording first
                </Text>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ThemeSwitcher className="hidden sm:inline-flex" />

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onOpenSettings()}
          tooltip="Settings"
          leadingIcon={<Settings className="size-4" />}
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
        title="Clear this transcript?"
        description="This permanently removes all transcript lines and speakers for this meeting. The meeting itself is kept and a new recording starts from 00:00. This can't be undone."
        confirmText="Clear transcript"
        cancelText="Cancel"
      />
    </>
  );
}
