'use client';

import { useState, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionTranscript, deleteSession, isSessionRecording, listSessions, type SessionMetadata } from '@/lib/meeting/session-store';
import { subscribe as subscribeMeetingStore } from '@/lib/meeting/store';
import {
  Badge,
  Button,
  ConfirmDialog,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  HStack,
  Heading,
  Input,
  ListItem,
  Text,
  VStack,
  useToast,
} from '@jensbouma123/acciva-ui';
import {
  ArrowRight,
  AudioLines,
  FileText,
  Mic,
  MonitorSpeaker,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Eraser,
  Trash2,
  Video,
  Pencil,
} from 'lucide-react';
import { formatClock } from '@/lib/meeting/export';
import type { CaptureMode } from '@/lib/meeting/types';
import { loadSessionTranscript } from '@/lib/meeting/persist';
import { filterSessions, groupSessionsByDay } from '@/lib/meeting/session-groups';
import { purgeExpiredSessions } from '@/lib/meeting/retention';
import { loadSettings } from '@/components/meeting/types';
import { openCount } from '@/lib/meeting/notes';
import { useT } from '@/lib/i18n/useT';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—';
  return formatClock(seconds);
}

function formatTime(timestamp: number): string {
  const locale = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('nl') ? 'nl-NL' : 'en-US';
  return new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Debounced copy of a value; the search box stays responsive on long lists. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Transcript text per session, read lazily and only while a query is active. */
function transcriptText(sessionId: string): string {
  const t = loadSessionTranscript(sessionId);
  return t ? t.segments.map((seg) => seg.text).join(' ') : '';
}

/* -------------------------------------------------------------------------- */
/* useSessionIndex — the single owner of the persisted session list.           */
/* Both the sidebar rail and the home list read from it, so a delete in one   */
/* is immediately visible in the other.                                       */
/* -------------------------------------------------------------------------- */

function useSessionIndex() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setSessions(listSessions());
  }, []);

  // Load sessions on mount (never during render — hydration rule).
  useEffect(() => {
    // App start: drop meetings past the retention period before listing.
    purgeExpiredSessions(loadSettings().retention);
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from session index */
    setSessions(listSessions());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The index can change outside the list (e.g. Settings › Delete all).
  useEffect(() => {
    window.addEventListener('mn:sessions-changed', refresh);
    return () => window.removeEventListener('mn:sessions-changed', refresh);
  }, [refresh]);

  const { toast } = useToast();
  const t = useT('sidebar');
  const remove = useCallback(
    (sessionId: string): boolean => {
      let removed = false;
      try {
        if (isSessionRecording(sessionId)) {
          toast.warning(t('stopBeforeDelete'));
          return false;
        }
        removed = deleteSession(sessionId);
      } catch {
        // Never throw — the list keeps a stale entry until the next refresh.
      }
      refresh();
      return removed;
    },
    [refresh, toast, t]
  );

  const clear = useCallback(
    (sessionId: string): boolean => {
      let cleared = false;
      try {
        cleared = clearSessionTranscript(sessionId);
      } catch {
        // Never throw — the row keeps its stale counts until the next refresh.
      }
      if (cleared) toast({ title: t('cleared'), variant: 'success' });
      else toast.warning(t('stopBeforeClear'));
      refresh();
      return cleared;
    },
    [refresh, toast, t]
  );

  return { sessions, loaded, refresh, remove, clear };
}

/* -------------------------------------------------------------------------- */
/* Delete confirmation — one dialog, driven by whichever list asked for it.    */
/* -------------------------------------------------------------------------- */

interface DeleteSessionDialogProps {
  session: SessionMetadata | null;
  onClose: () => void;
  onConfirm: (sessionId: string) => void;
}

function DeleteSessionDialog({ session, onClose, onConfirm }: DeleteSessionDialogProps) {
  const t = useT('sidebar');
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={() => {
        if (session) onConfirm(session.sessionId);
      }}
      variant="danger"
      title={t('deleteTitle')}
      description={
        <>{t('deleteDescription').replace('{title}', session?.title ?? '')}</>
      }
      confirmText={t('deleteConfirm')}
      cancelText={t('cancel')}
    />
  );
}

function ClearTranscriptDialog({ session, onClose, onConfirm }: DeleteSessionDialogProps) {
  const t = useT('sidebar');
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={() => {
        if (session) onConfirm(session.sessionId);
      }}
      variant="danger"
      title={t('clearTitle')}
      description={
        <>{t('clearDescription').replace('{title}', session?.title ?? '')}</>
      }
      confirmText={t('clearConfirm')}
      cancelText={t('cancel')}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* SessionSidebar — the left rail: brand, rail toggle, session rows.           */
/* -------------------------------------------------------------------------- */

export interface SessionSidebarProps {
  /** Session currently open in the main content area (highlighted). */
  activeSessionId?: string | null;
  /** Navigate to a session in the main content. */
  onOpenSession: (sessionId: string) => void;
  /** Open the "create new session" dialog (empty string triggers dialog). */
  onNewSession: () => void;
  /** Whether the sidebar is visible/expanded. */
  open: boolean;
  /** Toggle sidebar open/close. */
  onToggle: () => void;
}

export function SessionSidebar({
  activeSessionId,
  onOpenSession,
  onNewSession,
  open,
  onToggle,
}: SessionSidebarProps) {
  const t = useT('sidebar');
  const router = useRouter();
  const { sessions, remove, clear } = useSessionIndex();
  const [deleteTarget, setDeleteTarget] = useState<SessionMetadata | null>(null);
  const [clearTarget, setClearTarget] = useState<SessionMetadata | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query, 200);
  const language = useContext(LanguageContext) ?? 'en';
  const todayLabel = t('today');
  const yesterdayLabel = t('yesterday');
  const groups = useMemo(
    () =>
      groupSessionsByDay(filterSessions(sessions, debouncedQuery, transcriptText), undefined, language, {
        today: todayLabel,
        yesterday: yesterdayLabel,
      }),
    [sessions, debouncedQuery, language, todayLabel, yesterdayLabel],
  );

  // Opened from the headers' "Show meetings" buttons below lg.
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener('mn:open-sessions', handler);
    return () => window.removeEventListener('mn:open-sessions', handler);
  }, []);

  const openSession = useCallback(
    (sessionId: string) => {
      onOpenSession(sessionId);
      setMobileOpen(false);
    },
    [onOpenSession]
  );

  const railBody = (
    <VStack spacing="none" fill className="h-full bg-surface">
      {/* Rail header */}
      <HStack
        as="header"
        spacing="sm"
        justify="between"
        className="h-14 box-border shrink-0 border-b border-border-subtle px-3"
      >
        <HStack spacing="sm" className="min-w-0 flex-1">
          <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Heading as="span" size="xs" variant="muted" weight="semibold" truncate>
            {t('meetings')}
          </Heading>
          <Badge variant="neutral" size="sm">
            {sessions.length}
          </Badge>
        </HStack>

        <HStack spacing="xs" className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onNewSession}
            tooltip={t('new')}
            aria-label={t('new')}
            leadingIcon={<Plus className="size-4" />}
            className="touch-target-44"
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onToggle}
            tooltip={open ? t('hide') : t('show')}
            leadingIcon={open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            className="hidden touch-target-44 lg:inline-flex"
          />
        </HStack>
      </HStack>

      {/* Search */}
      {sessions.length > 0 && (
        <div className="shrink-0 border-b border-border-subtle p-2">
          <Input
            type="search"
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            leadingIcon={<Search className="size-4" />}
            clearable
            onClear={() => setQuery('')}
          />
        </div>
      )}

      {/* Rail body */}
      <VStack spacing="none" fill className="flex-1 scroll-pt-10 overflow-y-auto">
        {sessions.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Video className="size-5" />}
            title={t('empty')}
            description={t('emptyHint')}
            action={
              <Button
                size="sm"
                variant="outline"
                leadingIcon={<Plus className="size-4" />}
                onClick={onNewSession}
              >
                {t('new')}
              </Button>
            }
            className="my-auto"
          />
        ) : groups.length === 0 ? (
          <EmptyState size="sm" icon={<Search className="size-5" />} title={t('noResults')} className="my-auto" />
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {group.label}
              </h3>
              <VStack spacing="none" className="w-full px-3 pb-2 pt-1">
                {group.sessions.map((session) => (
                  <RailSessionRow
                    key={session.sessionId}
                    session={session}
                    isActive={activeSessionId === session.sessionId}
                    onOpen={() => openSession(session.sessionId)}
                    onClear={() => setClearTarget(session)}
                    onDelete={() => setDeleteTarget(session)}
                  />
                ))}
              </VStack>
            </section>
          ))
        )}
      </VStack>
    </VStack>
  );

  return (
    <>
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        side="left"
        detent="full"
        minSize={260}
        defaultSize={300}
        maxSize={360}
        draggable
        swipeToDismiss
        showCloseOnTouch
        aria-label={t('meetings')}
        className="lg:hidden"
      >
        {railBody}
      </Drawer>

      {/* Desktop rail */}
      <aside
        aria-label={t('meetings')}
        className={[
          'hidden shrink-0 border-r border-border-subtle transition-[width] duration-200 ease-in-out lg:flex lg:flex-col',
          open ? 'w-72 xl:w-80' : 'w-16',
        ].join(' ')}
      >
        {open ? (
          railBody
        ) : (
          <VStack spacing="lg" align="center" className="h-full">
            <HStack
              as="header"
              align="center"
              justify="center"
              className="h-14 w-full box-border shrink-0 border-b border-border-subtle"
            >
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onToggle}
                tooltip={t('show')}
                leadingIcon={<PanelLeftOpen className="size-4" />}
                className="touch-target-44"
              />
            </HStack>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onNewSession}
              tooltip={t('new')}
              aria-label={t('new')}
              leadingIcon={<Plus className="size-4" />}
              className="touch-target-44"
            />
          </VStack>
        )}
      </aside>

      <ClearTranscriptDialog
        session={clearTarget}
        onClose={() => setClearTarget(null)}
        onConfirm={(id) => {
          clear(id);
          setClearTarget(null);
        }}
      />

      <DeleteSessionDialog
        session={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => {
          const removed = remove(id);
          setDeleteTarget(null);
          // The open meeting is gone: the root route picks the next session or the empty state.
          if (removed && id === activeSessionId) router.replace('/');
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact rail row.                                                          */
/* -------------------------------------------------------------------------- */

/** Capture-source glyph; sessions recorded before it was stored keep the document icon. */
function CaptureIcon({ mode }: { mode: CaptureMode | undefined }) {
  const t = useT('sidebar');
  const label =
    mode === 'mic' ? t('microphone') : mode === 'system' ? t('systemAudio') : mode === 'both' ? t('micAndSystem') : null;
  if (!label) return <FileText className="size-4" />;
  const Icon = mode === 'mic' ? Mic : mode === 'system' ? MonitorSpeaker : AudioLines;
  return (
    <span title={label} className="inline-flex">
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface RailSessionRowProps {
  session: SessionMetadata;
  isActive: boolean;
  onOpen: () => void;
  onClear: () => void;
  onDelete: () => void;
}

/**
 * Which badge a rail row shows. Recording wins over the draft flag: the
 * index stays `isDraft` until the first persist, so without this the row
 * being recorded would read "Not recorded".
 */
export function getRailBadgeState(
  session: SessionMetadata,
  recording: boolean,
): 'recording' | 'draft' | 'none' {
  if (recording) return 'recording';
  if (session.isDraft) return 'draft';
  return 'none';
}

export function RailSessionRow({ session, isActive, onOpen, onClear, onDelete }: RailSessionRowProps) {
  const t = useT('sidebar');
  // Re-render when a capture starts/stops so the badge flips without waiting
  // for the next index event (the stop persist then fills in the duration).
  useSyncExternalStore(subscribeMeetingStore, () => isSessionRecording(session.sessionId), () => false);
  const recording = isSessionRecording(session.sessionId);
  const badgeState = getRailBadgeState(session, recording);
  const locked = isSessionRecording(session.sessionId);
  const count = openCount(session.sessionId);
  const subtitle = `${formatTime(session.createdAt)} · ${formatDuration(session.durationSeconds)}`;
  return (
    <div className="group relative w-full">
      <ListItem
        title={session.title}
        subtitle={subtitle}
        selected={isActive}
        onClick={onOpen}
        leading={
          <span aria-hidden="true" className={session.isDraft ? 'text-muted-foreground' : 'text-primary-600'}>
            {session.isDraft ? <Pencil className="size-4" /> : <CaptureIcon mode={session.captureMode} />}
          </span>
        }
        trailing={<>
          {count > 0 && <Badge variant="neutral" size="xs">{t('openCount').replace('{n}', String(count))}</Badge>}
          {badgeState === 'recording' ? (
            <Badge variant="danger" size="xs" dot>{t('recording')}</Badge>
          ) : badgeState === 'draft' ? (
            <Badge variant="warning" size="xs">{t('notRecorded')}</Badge>
          ) : undefined}
        </>}
        className="w-full pr-10"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={t('more').replace('{title}', session.title)}
              leadingIcon={<MoreHorizontal className="size-4" />}
              className="touch-target-44"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={<ArrowRight className="size-4" />} onClick={onOpen}>
              {t('open')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="danger" icon={<Eraser className="size-4" />} disabled={locked} onClick={onClear}>
              {t('clear')}
            </DropdownMenuItem>
            {locked && (
              <Text size="xs" variant="muted" className="px-2 py-1">
                {t('stopFirst')}
              </Text>
            )}
            <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} disabled={locked} onClick={onDelete}>
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
