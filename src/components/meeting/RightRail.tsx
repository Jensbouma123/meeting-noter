'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSpeakerColor } from './speaker-theme';
import { useSpeakerStats } from '@/lib/meeting';
import { PanelRightClose, PanelRightOpen, Info, Users } from 'lucide-react';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { NotesPanel } from '@/components/notes/NotesPanel';
import type { Segment } from '@/lib/meeting/types';
import { useT } from '@/lib/i18n/useT';
import { setParticipants, useParticipants, useRecentParticipants } from '@/lib/meeting/participants';
import { ParticipantsEditor } from './ParticipantsEditor';
import { SpeakerAssign } from './SpeakerAssign';
import { isUnnamedSpeakerLabel, unassignedParticipants } from '@/lib/meeting/participants';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Text,
  useToast,
  VStack,
} from '@jensbouma123/acciva-ui';

/** Persisted collapse state — collapses to a thin icon rail, doesn't unmount. */
const RAIL_OPEN_KEY = 'mn.speakerRailOpen';
/** Below this width the rail defaults to collapsed (no persisted preference yet). */
const NARROW_BREAKPOINT_PX = 1024;

type SpeakerRow = ReturnType<typeof useSpeakerStats>[number];

function SpeakerLabel({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label]);
  return (
    <Text as="span" size="sm" variant="muted" truncate className="block min-w-0" title={truncated ? label : undefined}>
      <span ref={ref} className="block min-w-0 truncate">{label}</span>
    </Text>
  );
}

interface SpeakerListProps {
  rows: SpeakerRow[];
  sessionId: string;
  onAssigned: (added: number) => void;
}

function SpeakerList({ rows, sessionId, onAssigned }: SpeakerListProps) {
  const tp = useT('participants');
  if (rows.length === 0) {
    return (
      <EmptyState
        size="sm"
        compact
        icon={<Users className="size-5" aria-hidden="true" />}
        title={tp('noSpeakers')}
        description={tp('noSpeakersHint')}
      />
    );
  }
  return (
    <ul
      aria-labelledby="rail-speakers-h"
      className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0"
    >
      {rows.map((spk) => {
        const colorStyle = getSpeakerColor(spk.colorIndex);
        const named = !isUnnamedSpeakerLabel(spk.label);
        const pct = spk.percentage;
        const assign = (
          <SpeakerAssign
            appearance="rail"
            sessionId={sessionId}
            speakerId={spk.id}
            label={spk.label}
            source={spk.source}
            otherLabels={rows.filter((r) => r.id !== spk.id).map((r) => r.label)}
            onAssigned={onAssigned}
          />
        );
        return (
          <li key={spk.id} className="animate-turn-enter flex flex-col gap-1.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${colorStyle.dotClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {named ? (
                  assign
                ) : (
                  <SpeakerLabel label={spk.label} />
                )}
              </div>
              <Text size="xs" variant="muted" font="mono" className="shrink-0 tabular-nums">
                <span className="sr-only">{tp('talkTime')} </span>
                {formatDuration(spk.time)}
              </Text>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <ProgressTrack
                value={Math.max(3, pct)}
                label={tp('talkShare').replace('{name}', spk.label).replace('{pct}', String(Math.round(pct)))}
                barClassName={colorStyle.barBgClass}
                className="flex-1"
              />
              <Text
                size="xs"
                variant="muted"
                font="mono"
                className="w-8 shrink-0 text-right tabular-nums"
                aria-hidden="true"
              >
                {Math.round(pct)}%
              </Text>
            </div>
            {!named && <div className="pl-4">{assign}</div>}
          </li>
        );
      })}
    </ul>
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

type RailTab = 'participants' | 'summary';
const RAIL_TABS: RailTab[] = ['participants', 'summary'];

/** The rail's header: a tab switcher (WAI-ARIA tabs, arrow keys / Home / End
 *  move between tabs). Panels are labelled by `rail-tab-<name>`. */
function RailTabs({
  active,
  onChange,
  count,
  trailing,
}: {
  active: RailTab;
  onChange: (tab: RailTab) => void;
  count: number;
  trailing?: React.ReactNode;
}) {
  const t = useT('rail');
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = RAIL_TABS.indexOf(active);
    let next: number;
    if (e.key === 'ArrowRight') next = (i + 1) % RAIL_TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + RAIL_TABS.length) % RAIL_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = RAIL_TABS.length - 1;
    else return;
    e.preventDefault();
    onChange(RAIL_TABS[next]);
    document.getElementById(`rail-tab-${RAIL_TABS[next]}`)?.focus();
  };
  return (
    <div className="flex shrink-0 items-stretch justify-between gap-2 border-b border-border-subtle px-4">
      <div role="tablist" aria-label={t('tabs')} onKeyDown={onKeyDown} className="flex min-w-0 items-stretch gap-4">
        {RAIL_TABS.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`rail-tab-${tab}`}
              aria-selected={selected}
              aria-controls={`rail-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab)}
              className={`focus-ring relative flex items-center gap-1.5 whitespace-nowrap py-3 text-sm font-semibold transition-colors ${
                selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(tab)}
              {tab === 'participants' && (
                <Badge variant="neutral" size="xs" className="leading-none">
                  {count}
                </Badge>
              )}
              {selected && (
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="flex items-center">{trailing}</div>}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Meetings that already showed the "names added to your words" note. */
const notedSessions = new Set<string>();

/** Speaker directory + talk-time sidebar. Reads live from the meeting store
 *  (via `useSpeakerStats`), so it takes no props — it's self-sufficient. */
export function RightRail({ sessionId, segments = [] }: { sessionId: string; segments?: Segment[] }) {
  const t = useT('rail');
  const tp = useT('participants');
  const ts = useT('settings');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<RailTab>('participants');
  // Initial render must match the server (expanded); the real preference —
  // a saved choice, or the narrow-screen default — loads after mount.
  const [open, setOpen] = useState(true);

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

  const asideRef = useRef<HTMLElement>(null);
  // Which toggle button should take focus after the next open/close render.
  const pendingFocus = useRef<'show' | 'hide' | null>(null);

  const toggleOpen = useCallback(() => {
    const next = !open;
    pendingFocus.current = next ? 'hide' : 'show';
    try {
      window.localStorage.setItem(RAIL_OPEN_KEY, next ? '1' : '0');
    } catch {
      // Best-effort only.
    }
    setOpen(next);
  }, [open]);

  // Focus moves to the button that now exists after a toggle (not on mount).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const label = target === 'show' ? t('showRail') : t('hideRail');
    const button = Array.from(asideRef.current?.querySelectorAll('button') ?? []).find(
      (b) => b.getAttribute('aria-label') === label,
    );
    button?.focus();
  }, [open, t]);

  const onAssigned = (added: number) => {
    if (added > 0 && !notedSessions.has(sessionId)) {
      notedSessions.add(sessionId);
      toast({ title: ts('vocab.nameNote') });
    }
  };

  const participants = useParticipants(sessionId);
  const recentParticipants = useRecentParticipants();
  const unmatched = unassignedParticipants(participants, speakerStatRows.map((r) => r.label));
  const hasUnnamed = speakerStatRows.some((r) => isUnnamedSpeakerLabel(r.label));
  const [unmatchedBefore, unmatchedAfter] = (hasUnnamed ? tp('unassigned') : tp('notHeard')).split('{names}');

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
    <>
      <section
        aria-labelledby="rail-people-h"
        data-testid="participants-editor"
        className="flex w-full flex-col gap-2"
      >
        <h3 id="rail-people-h" className="m-0">
          <Text size="xs" weight="semibold" variant="muted">
            {tp('heading')}
          </Text>
        </h3>
        {participants.length === 0 && (
          <Text size="xs" variant="muted">
            {tp('railHint')}
          </Text>
        )}
        <ParticipantsEditor
          id="rail-participants-add"
          compact
          names={participants}
          suggestions={recentParticipants}
          onChange={(names) => setParticipants(sessionId, names)}
        />
      </section>
      <section
        aria-labelledby="rail-speakers-h"
        className="flex w-full flex-col gap-2 border-t border-border-subtle pt-3"
      >
        <h3 id="rail-speakers-h" className="m-0">
          <Text size="xs" weight="semibold" variant="muted">
            {tp('speakers')}
          </Text>
        </h3>
        {speakerStatRows.length > 0 && unmatched.length > 0 && (
          <div
            role="status"
            data-testid="participants-unassigned"
            className="flex items-start gap-2 rounded-md border border-border-subtle bg-elevation-2 px-2.5 py-2 text-xs text-foreground"
          >
            <Info className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {unmatchedBefore}
              <strong className="font-semibold">{unmatched.join(', ')}</strong>
              {unmatchedAfter}
            </span>
          </div>
        )}
        <SpeakerList rows={speakerStatRows} sessionId={sessionId} onAssigned={onAssigned} />
      </section>
    </>
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
        <RailTabs active={activeTab} onChange={setActiveTab} count={speakerStatRows.length} />
        <VStack spacing="sm" role="tabpanel" id={`rail-panel-${activeTab}`} aria-labelledby={`rail-tab-${activeTab}`} className="min-h-0 flex-1 overflow-y-auto px-1 pt-1 pb-4">
          {activeTab === 'participants' ? list : <NotesPanel sessionId={sessionId} speakers={speakerStatRows.map((row) => ({ id: row.id, label: row.label, colorIndex: row.colorIndex, source: row.source }))} segments={segments} />}
        </VStack>
      </VStack>
    </Drawer>
  );

  // One aside for both states: only its width animates (same transition as the
  // left sidebar); the bodies keep a fixed width so content is clipped, not reflowed.
  return (
    <>
      {drawer}
      <aside
        ref={asideRef}
        className={[
          'hidden shrink-0 select-none flex-col overflow-hidden border-l border-border-subtle bg-surface/50 transition-[width] duration-200 ease-in-out motion-reduce:transition-none lg:flex',
          open ? 'w-64 xl:w-72' : 'w-12',
        ].join(' ')}
        aria-label={open ? t('rail') : t('participants')}
      >
        {!open && (
          <div className="flex h-full w-12 flex-col items-center gap-3 py-3">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="touch-target-44"
              onClick={toggleOpen}
              tooltip={t('showRail')}
              aria-label={t('showRail')}
              leadingIcon={<PanelRightOpen className="size-4" aria-hidden="true" />}
            />
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            {speakerStatRows.length > 0 && (
              <Badge variant="neutral" size="xs">
                {speakerStatRows.length}
              </Badge>
            )}
          </div>
        )}
        {open && (
      <div className="flex min-h-0 w-64 flex-1 shrink-0 flex-col gap-3 xl:w-72">
        <RailTabs
          active={activeTab}
          onChange={setActiveTab}
          count={speakerStatRows.length}
          trailing={
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="touch-target-44"
              onClick={toggleOpen}
              tooltip={t('hideRail')}
              aria-label={t('hideRail')}
              leadingIcon={<PanelRightClose className="size-4" aria-hidden="true" />}
            />
          }
        />
        <VStack spacing="sm" role="tabpanel" id={`rail-panel-${activeTab}`} aria-labelledby={`rail-tab-${activeTab}`} className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
          {activeTab === 'participants' ? list : <NotesPanel sessionId={sessionId} speakers={speakerStatRows.map((row) => ({ id: row.id, label: row.label, colorIndex: row.colorIndex, source: row.source }))} segments={segments} />}
        </VStack>
      </div>
        )}
      </aside>
    </>
  );
}
