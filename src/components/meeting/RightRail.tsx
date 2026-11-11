'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { getSpeakerColor } from './speaker-theme';
import { useSpeakerStats } from '@/lib/meeting';
import type { Speaker } from '@/lib/meeting';
import { meeting } from './store';
import { Check, ChevronLeft, ChevronRight, Pencil, Users } from 'lucide-react';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { NotesPanel } from '@/components/notes/NotesPanel';
import type { Segment } from '@/lib/meeting/types';
import { useT } from '@/lib/i18n/useT';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  HStack,
  Heading,
  Input,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';

/** Persisted collapse state — collapses to a thin icon rail, doesn't unmount. */
const RAIL_OPEN_KEY = 'mn.speakerRailOpen';
/** Below this width the rail defaults to collapsed (no persisted preference yet). */
const NARROW_BREAKPOINT_PX = 1024;

type SpeakerRow = ReturnType<typeof useSpeakerStats>[number];

interface SpeakerListProps {
  rows: SpeakerRow[];
  editingSpeakerId: string | null;
  nameDraft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNameDraftChange: (v: string) => void;
  onStartEditing: (speaker: SpeakerRow) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function SpeakerList({
  rows,
  editingSpeakerId,
  nameDraft,
  inputRef,
  onNameDraftChange,
  onStartEditing,
  onCommit,
  onCancel,
}: SpeakerListProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        size="sm"
        compact
        icon={<Users className="size-5" aria-hidden="true" />}
        title="No speakers yet"
        description="Speakers show up here once people start talking. Tap a name to rename it."
      />
    );
  }
  return (
    <>
      {rows.map((spk) => {
        const colorStyle = getSpeakerColor(spk.colorIndex);
        const isEditing = editingSpeakerId === spk.id;
        return (
          <Card
            key={spk.id}
            variant="bordered"
            padding="sm"
            className="animate-turn-enter shadow-2xs hover:border-border"
          >
            <VStack spacing="sm" className="w-full">
              <HStack spacing="sm" justify="between">
                <HStack spacing="sm" className="min-w-0 flex-1">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${colorStyle.dotClass}`}
                    aria-hidden="true"
                  />
                  {isEditing ? (
                    <HStack spacing="xs" className="flex-1">
                      <Input
                        ref={inputRef}
                        size="xs"
                        value={nameDraft}
                        onChange={(e) => onNameDraftChange(e.target.value)}
                        onBlur={onCommit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCommit();
                          if (e.key === 'Escape') onCancel();
                        }}
                        maxLength={40}
                        aria-label={`Rename ${spk.label}`}
                        className="min-w-0 flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={onCommit}
                        tooltip="Save name"
                        className="touch-target-44"
                        leadingIcon={<Check className="size-4 text-success" />}
                      />
                    </HStack>
                  ) : (
                    <Button
                      variant="ghost"
                      size={{ base: 'md', md: 'sm' }}
                      onClick={() => onStartEditing(spk)}
                      tooltip={`Rename ${spk.label}`}
                      trailingIcon={
                        <Pencil className="size-3 opacity-60 group-hover:opacity-100" />
                      }
                      className="group min-w-0 justify-start"
                    >
                      <Text
                        as="span"
                        size="xs"
                        weight="semibold"
                        truncate
                        className={colorStyle.textClass}
                      >
                        {spk.label}
                      </Text>
                    </Button>
                  )}
                </HStack>
                <Text size="xs" variant="muted" font="mono" className="shrink-0 tabular-nums">
                  {formatDuration(spk.time)}
                </Text>
              </HStack>

              <HStack spacing="sm">
                <ProgressTrack
                  value={Math.max(3, spk.percentage)}
                  label={`${spk.label} share of talk time`}
                  barClassName={colorStyle.barBgClass}
                  className="flex-1"
                />
                <Badge variant="neutral" size="xxs" className="w-9 justify-end tabular-nums">
                  {Math.round(spk.percentage)}%
                </Badge>
              </HStack>
            </VStack>
          </Card>
        );
      })}
    </>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Speaker directory + talk-time sidebar. Reads live from the meeting store
 *  (via `useSpeakerStats`), so it takes no props — it's self-sufficient. */
export function RightRail({ sessionId, segments = [] }: { sessionId: string; segments?: Segment[] }) {
  const t = useT('rail');
  const [activeTab, setActiveTab] = useState<'participants' | 'summary'>('participants');
  // Initial render must match the server (expanded); the real preference —
  // a saved choice, or the narrow-screen default — loads after mount.
  const [open, setOpen] = useState(true);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive speaker stats from the store (single source of truth).
  const speakerStatRows = useSpeakerStats();

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from localStorage/viewport */
    try {
      const saved = window.localStorage.getItem(RAIL_OPEN_KEY);
      if (saved !== null) {
        setOpen(saved === '1');
      } else if (window.innerWidth < NARROW_BREAKPOINT_PX) {
        setOpen(false);
      }
    } catch {
      // Best-effort only — falls back to expanded.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(RAIL_OPEN_KEY, next ? '1' : '0');
      } catch {
        // Best-effort only.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (editingSpeakerId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingSpeakerId]);

  const startEditing = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setNameDraft(speaker.label);
  };

  const commitEdit = () => {
    if (!editingSpeakerId) return;
    const trimmed = nameDraft.trim();
    if (trimmed.length > 0) {
      meeting.renameSpeaker(editingSpeakerId, trimmed);
    }
    setEditingSpeakerId(null);
  };

  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const openDrawer = () => setDrawerOpen(true);
    window.addEventListener('mn:open-speakers', openDrawer);
    return () => window.removeEventListener('mn:open-speakers', openDrawer);
  }, []);

  useEffect(() => {
    // Crossing into the docked layout hides the drawer.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to viewport change
    if (isLgUp) setDrawerOpen(false);
  }, [isLgUp]);

  const list = (
    <SpeakerList
      rows={speakerStatRows}
      editingSpeakerId={editingSpeakerId}
      nameDraft={nameDraft}
      inputRef={inputRef}
      onNameDraftChange={setNameDraft}
      onStartEditing={startEditing}
      onCommit={commitEdit}
      onCancel={() => setEditingSpeakerId(null)}
    />
  );

  const drawer = !isLgUp && (
    <Drawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      side={isMdUp ? 'right' : 'bottom'}
      defaultDetent="half"
      defaultSize={320}
      maxSize={400}
      draggable
      swipeToDismiss
      showCloseOnTouch
      aria-label={t('participants')}
    >
      <VStack spacing="sm" className="h-full min-h-0 p-4">
        <HStack spacing="sm" role="tablist" aria-label={t('tabs')}>
          <Button role="tab" aria-selected={activeTab === 'participants'} size="sm" variant={activeTab === 'participants' ? 'primary' : 'ghost'} onClick={() => setActiveTab('participants')}>{t('participants')} <Badge variant="neutral" size="sm">{speakerStatRows.length}</Badge></Button>
          <Button role="tab" aria-selected={activeTab === 'summary'} size="sm" variant={activeTab === 'summary' ? 'primary' : 'ghost'} onClick={() => setActiveTab('summary')}>{t('summary')}</Button>
        </HStack>
        <VStack spacing="sm" className="min-h-0 flex-1 overflow-y-auto pb-4">
          {activeTab === 'participants' ? list : <NotesPanel sessionId={sessionId} speakers={speakerStatRows.map((row) => ({ id: row.id, label: row.label, colorIndex: row.colorIndex, source: row.source }))} segments={segments} />}
        </VStack>
      </VStack>
    </Drawer>
  );

  if (!open) {
    return (
      <>
        {drawer}
        <aside
          className="hidden w-12 shrink-0 select-none flex-col items-center gap-3 border-l border-border-subtle bg-surface/50 py-3 lg:flex"
          aria-label={t('participants')}
        >
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="touch-target-44"
            onClick={toggleOpen}
            tooltip={t('showRail')}
            aria-label={t('showRail')}
            leadingIcon={<ChevronLeft className="size-4" />}
          />
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          {speakerStatRows.length > 0 && (
            <Badge variant="neutral" size="xs">
              {speakerStatRows.length}
            </Badge>
          )}
        </aside>
      </>
    );
  }

  return (
    <>
      {drawer}
      <aside
        className="hidden w-64 shrink-0 xl:w-72 select-none flex-col gap-3 border-l border-border-subtle bg-surface/50 lg:flex"
        aria-label={t('rail')}
      >
        <HStack spacing="sm" justify="between" className="shrink-0 px-4 pt-4">
          <HStack spacing="sm">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            <Heading as="h2" level={2} size="xs" variant="muted" weight="semibold">
              {activeTab === 'participants' ? t('participants') : t('summary')}
            </Heading>
            <Badge variant="neutral" size="sm">
              {speakerStatRows.length}
            </Badge>
          </HStack>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="touch-target-44"
            onClick={toggleOpen}
            tooltip={t('hideRail')}
            aria-label={t('hideRail')}
            leadingIcon={<ChevronRight className="size-4" />}
          />
        </HStack>

        <HStack spacing="sm" role="tablist" aria-label={t('tabs')} className="shrink-0 px-4">
          <Button role="tab" aria-selected={activeTab === 'participants'} size="sm" variant={activeTab === 'participants' ? 'primary' : 'ghost'} onClick={() => setActiveTab('participants')}>{t('participants')}</Button>
          <Button role="tab" aria-selected={activeTab === 'summary'} size="sm" variant={activeTab === 'summary' ? 'primary' : 'ghost'} onClick={() => setActiveTab('summary')}>{t('summary')}</Button>
        </HStack>
        <VStack spacing="sm" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {activeTab === 'participants' ? list : <NotesPanel sessionId={sessionId} speakers={speakerStatRows.map((row) => ({ id: row.id, label: row.label, colorIndex: row.colorIndex, source: row.source }))} segments={segments} />}
        </VStack>
      </aside>
    </>
  );
}
