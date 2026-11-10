'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionTranscript, deleteSession, isSessionRecording, listSessions, type SessionMetadata } from '@/lib/meeting/session-store';
import { subscribe as subscribeMeetingStore } from '@/lib/meeting/store';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  HStack,
  Heading,
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
  Eraser,
  Trash2,
  Video,
  Pencil,
} from 'lucide-react';
import { formatClock } from '@/lib/meeting/export';
import type { CaptureMode } from '@/lib/meeting/types';

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—';
  return formatClock(seconds);
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  const remove = useCallback(
    (sessionId: string): boolean => {
      let removed = false;
      try {
        if (isSessionRecording(sessionId)) {
          toast.warning('Stop the recording before deleting this session.');
          return false;
        }
        removed = deleteSession(sessionId);
      } catch {
        // Never throw — the list keeps a stale entry until the next refresh.
      }
      refresh();
      return removed;
    },
    [refresh, toast]
  );

  const clear = useCallback(
    (sessionId: string): boolean => {
      let cleared = false;
      try {
        cleared = clearSessionTranscript(sessionId);
      } catch {
        // Never throw — the row keeps its stale counts until the next refresh.
      }
      if (cleared) toast({ title: 'Transcript cleared', variant: 'success' });
      else toast.warning('Stop the recording first');
      refresh();
      return cleared;
    },
    [refresh, toast]
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
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={() => {
        if (session) onConfirm(session.sessionId);
      }}
      variant="danger"
      title="Delete this meeting?"
      description={
        <>
          This permanently deletes <strong>{session ? `“${session.title}”` : 'this meeting'}</strong>{' '}
          and its transcript. This can&apos;t be undone.
        </>
      }
      confirmText="Delete meeting"
      cancelText="Cancel"
    />
  );
}

function ClearTranscriptDialog({ session, onClose, onConfirm }: DeleteSessionDialogProps) {
  return (
    <ConfirmDialog
      open={session !== null}
      onClose={onClose}
      onConfirm={() => {
        if (session) onConfirm(session.sessionId);
      }}
      variant="danger"
      title="Clear this transcript?"
      description={
        <>
          This permanently removes all transcript lines and speakers from{' '}
          <strong>{session ? `“${session.title}”` : 'this meeting'}</strong>. The meeting is kept and
          a new recording starts from 00:00. This can&apos;t be undone.
        </>
      }
      confirmText="Clear transcript"
      cancelText="Cancel"
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
  const router = useRouter();
  const { sessions, remove, clear } = useSessionIndex();
  const [deleteTarget, setDeleteTarget] = useState<SessionMetadata | null>(null);
  const [clearTarget, setClearTarget] = useState<SessionMetadata | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        className="h-14 shrink-0 border-b border-border-subtle px-3"
      >
        <HStack spacing="sm" className="min-w-0 flex-1">
          <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Heading as="span" size="xs" variant="muted" weight="semibold" truncate>
            Meetings
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
            tooltip="New meeting"
            leadingIcon={<Plus className="size-4" />}
            className="touch-target-44"
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onToggle}
            tooltip={open ? 'Hide meetings list' : 'Show meetings list'}
            leadingIcon={open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            className="hidden touch-target-44 lg:inline-flex"
          />
        </HStack>
      </HStack>

      {/* Rail body */}
      <VStack spacing="none" fill className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Video className="size-5" />}
            title="No meetings yet"
            description="Meetings you record show up here."
            action={
              <Button
                size="sm"
                variant="outline"
                leadingIcon={<Plus className="size-4" />}
                onClick={onNewSession}
              >
                New meeting
              </Button>
            }
            className="my-auto"
          />
        ) : (
          <VStack spacing="xs" className="w-full">
            {sessions.map((session) => (
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
        aria-label="Meetings"
        className="lg:hidden"
      >
        {railBody}
      </Drawer>

      {/* Desktop rail */}
      <aside
        aria-label="Meetings"
        className={[
          'hidden shrink-0 border-r border-border-subtle transition-[width] duration-200 ease-in-out lg:flex lg:flex-col',
          open ? 'w-72 xl:w-80' : 'w-16',
        ].join(' ')}
      >
        {open ? (
          railBody
        ) : (
          <VStack spacing="lg" align="center" className="h-full py-3">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onToggle}
              tooltip="Show meetings list"
              leadingIcon={<PanelLeftOpen className="size-4" />}
              className="touch-target-44"
            />
            <Divider className="w-8" />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onNewSession}
              tooltip="New meeting"
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
  const label =
    mode === 'mic' ? 'Microphone only' : mode === 'system' ? 'System audio only' : mode === 'both' ? 'Microphone and system audio' : null;
  if (!label) return <FileText className="size-3.5" />;
  const Icon = mode === 'mic' ? Mic : mode === 'system' ? MonitorSpeaker : AudioLines;
  return (
    <span title={label} className="inline-flex">
      <Icon className="size-3.5" />
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
  // Re-render when a capture starts/stops so the badge flips without waiting
  // for the next index event (the stop persist then fills in the duration).
  useSyncExternalStore(subscribeMeetingStore, () => isSessionRecording(session.sessionId), () => false);
  const recording = isSessionRecording(session.sessionId);
  const badgeState = getRailBadgeState(session, recording);
  return (
    <Card
      variant={isActive ? 'bordered' : 'ghost'}
      padding="sm"
      className={[
        session.isDraft ? 'border-dashed border-border' : '',
        isActive ? 'bg-primary-500/5' : '',
      ].join(' ')}
    >
      <HStack spacing="sm" align="center">
        <Button
          variant="ghost"
          onClick={onOpen}
          aria-current={isActive ? 'page' : undefined}
          className="h-auto min-w-0 flex-1 justify-start gap-2 px-1 py-1 text-left"
        >
        <span
          aria-hidden="true"
          className={[
            'flex size-7 shrink-0 items-center justify-center rounded-md',
            session.isDraft
              ? 'bg-warning-500/10 text-warning-600'
              : 'bg-elevation-1 text-primary-600',
          ].join(' ')}
        >
          {session.isDraft ? (
            <Pencil className="size-3.5" />
          ) : (
            <CaptureIcon mode={session.captureMode} />
          )}
        </span>

        <VStack spacing="none" className="min-w-0 flex-1">
          <HStack spacing="xs" className="w-full">
            <Text size="xs" weight="semibold" truncate className="flex-1">
              {session.title}
            </Text>
            {badgeState === 'recording' ? (
              <Badge variant="danger" size="xs" dot>Recording</Badge>
            ) : badgeState === 'draft' ? (
              <Badge variant="warning" size="xs">Not recorded</Badge>
            ) : null}
          </HStack>
          <HStack spacing="xs" className="min-w-0">
            <Text size="xxs" variant="muted" truncate>
              {formatDate(session.createdAt)}
            </Text>
            <Text size="xxs" variant="subtle" aria-hidden="true">
              ·
            </Text>
            <Text size="xxs" variant="muted" font="mono" className="shrink-0">
              {formatDuration(session.durationSeconds)}
            </Text>
          </HStack>
        </VStack>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={`More actions for “${session.title}”`}
              leadingIcon={<MoreHorizontal className="size-4" />}
              className="touch-target-44"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              icon={<ArrowRight className="size-4" />}
              onClick={onOpen}
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="danger"
              icon={<Eraser className="size-4" />}
              disabled={isSessionRecording(session.sessionId)}
              onClick={onClear}
            >
              Clear transcript
            </DropdownMenuItem>
            {isSessionRecording(session.sessionId) && (
              <Text size="xs" variant="muted" className="px-2 py-1">
                Stop the recording first
              </Text>
            )}
            <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} disabled={isSessionRecording(session.sessionId)} onClick={onDelete}>
              Delete meeting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HStack>
    </Card>
  );
}
