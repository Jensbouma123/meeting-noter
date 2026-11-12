'use client';

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  EmptyState, HStack, Heading, Input, Popover, Text, VStack,
} from '@jensbouma123/acciva-ui';
import { CalendarDays, ChevronDown, ChevronRight, Check, MoreHorizontal, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import {
  addAction, addDecision, getNotes, removeAction, removeDecision, subscribe,
  suggestFromSegments, updateAction,
  type ActionItem, type Decision,
} from '@/lib/meeting/notes';
import type { Segment, Speaker } from '@/lib/meeting/types';
import { useT } from '@/lib/i18n/useT';
import { useSessionIntelligence } from '@/lib/d1/store';
import { isD1ModelCached, runD1AnalysisForSession, D1_REGISTRY_KEY } from '@/lib/meeting/d1-bridge';
import { isCaptureActive } from '@/lib/meeting/store';
import { retryDownload, subscribeRegistry } from '@/lib/asr/browser';
import { dispatchFixWord, dispatchJumpToSegment, flaggedWords, formatStamp, indexD1 } from '@/components/meeting/d1-view';

interface NotesPanelProps {
  sessionId: string;
  speakers?: Speaker[];
  segments?: Segment[];
}

type T = (key: string) => string;

const CHIP = 'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-xs text-muted-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1';

export function NotesPanel({ sessionId, speakers = [], segments = [] }: NotesPanelProps) {
  const t = useT('notes');
  const subscribeSession = useCallback((callback: () => void) => subscribe(sessionId, callback), [sessionId]);
  const getSessionNotes = useCallback(() => JSON.stringify(getNotes(sessionId)), [sessionId]);
  const notes = useSyncExternalStore(
    subscribeSession,
    getSessionNotes,
    () => '{"actions":[],"decisions":[]}',
  );
  const parsedNotes = JSON.parse(notes) as ReturnType<typeof getNotes>;
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = suggestFromSegments(segments).filter((suggestion) =>
    !dismissed.has(suggestion.sourceSegmentId)
      && !parsedNotes.actions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId)
      && !parsedNotes.decisions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId),
  );
  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  return (
    <VStack spacing="md" className="w-full min-w-0">
      <NoteSection id="notes-actions" title={t('actions')} count={parsedNotes.actions.length} t={t}
        addLabel={t('addAction')} placeholder={t('actionPlaceholder')} empty={t('emptyActions')}
        onSave={(text) => addAction(sessionId, text)}>
        {parsedNotes.actions.map((item) => (
          <ActionRow key={item.id} item={item} speakers={speakers} t={t} sessionId={sessionId} />
        ))}
      </NoteSection>

      <NoteSection id="notes-decisions" title={t('decisions')} count={parsedNotes.decisions.length} t={t}
        addLabel={t('addDecision')} placeholder={t('decisionPlaceholder')} empty={t('emptyDecisions')}
        onSave={(text) => addDecision(sessionId, text)}>
        {parsedNotes.decisions.map((item) => <DecisionRow key={item.id} item={item} sessionId={sessionId} t={t} />)}
      </NoteSection>

      {suggestions.length > 0 && <section aria-label={t('suggestions')} className="w-full min-w-0">
        <button type="button" aria-expanded={suggestionsOpen} onClick={() => setSuggestionsOpen((v) => !v)}
          className="flex w-full min-w-0 items-center gap-1 rounded-md py-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1">
          {suggestionsOpen ? <ChevronDown aria-hidden="true" className="size-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="size-4 shrink-0" />}
          <span className="truncate">{t('suggestions')} ({suggestions.length})</span>
        </button>
        {suggestionsOpen && <ul className="mt-1 flex w-full min-w-0 flex-col gap-1">
          {suggestions.map((suggestion) => <li key={suggestion.sourceSegmentId} className="flex min-w-0 items-center gap-1">
            <Text size="xs" className="min-w-0 flex-1 truncate" title={suggestion.text}>{suggestion.text}</Text>
            <Button iconOnly size="sm" variant="ghost" tooltip={t('addSuggestion')} aria-label={`${t('addSuggestion')}: ${suggestion.text}`}
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => suggestion.kind === 'action'
                ? addAction(sessionId, suggestion.text, { sourceSegmentId: suggestion.sourceSegmentId })
                : addDecision(sessionId, suggestion.text, suggestion.sourceSegmentId)} />
            <Button iconOnly size="sm" variant="ghost" tooltip={t('dismissSuggestion')} aria-label={`${t('dismissSuggestion')}: ${suggestion.text}`}
              leadingIcon={<X aria-hidden="true" className="size-4" />}
              onClick={() => dismiss(suggestion.sourceSegmentId)} />
          </li>)}
        </ul>}
      </section>}

      <D1Insights sessionId={sessionId} speakers={speakers} segments={segments} t={t} />

      {parsedNotes.actions.length === 0 && parsedNotes.decisions.length === 0 && suggestions.length === 0 && (
        <EmptyState size="sm" compact title={t('emptyTitle')} description={t('empty')} />
      )}
    </VStack>
  );
}

/**
 * Local D1 analysis of a finished session: model status, scan, the decisions
 * and action items it found, uncertain words to review, and speaker hints.
 * Every mark is advisory; saving a result adds a note, nothing else changes.
 */
function D1Insights({ sessionId, speakers, segments, t }: {
  sessionId: string; speakers: Speaker[]; segments: Segment[]; t: T;
}) {
  const [open, setOpen] = useState(false);
  const intelligence = useSessionIntelligence(sessionId);
  const modelCached = useSyncExternalStore(subscribeRegistry, isD1ModelCached, () => false);
  const index = useMemo(() => indexD1(intelligence, segments), [intelligence, segments]);
  const speakerLabel = useMemo(() => new Map(speakers.map((s) => [s.id, s.label])), [speakers]);
  const flagged = useMemo(
    () => segments.flatMap((seg) => flaggedWords(seg, index.get(seg.id)?.triage).map((word) => ({ key: `${seg.id}:${word}`, word, seg }))),
    [segments, index],
  );
  const hints = useMemo(() => segments.filter((seg) => index.get(seg.id)?.triage?.suspectSpeaker), [segments, index]);

  const recording = isCaptureActive();
  const running = intelligence.status === 'running';
  const hasResults = Object.keys(intelligence.triageBySegment).length > 0
    || intelligence.decisions.length > 0 || intelligence.actionItems.length > 0;
  const count = intelligence.decisions.length + intelligence.actionItems.length + flagged.length + hints.length;

  const scan = () => {
    const byId = Object.fromEntries(speakers.map((s) => [s.id, s]));
    void runD1AnalysisForSession(sessionId, segments, byId, { force: true }).catch(() => {});
  };
  const download = () => { void retryDownload(D1_REGISTRY_KEY).catch(() => {}); };
  const jump = (segmentId: string | undefined) => { if (segmentId) dispatchJumpToSegment(segmentId); };
  const jumpButton = (start: number, segmentId: string | undefined) => (
    <button type="button" disabled={!segmentId} onClick={() => jump(segmentId)}
      aria-label={t('d1Jump').replace('{time}', formatStamp(start))}
      className="shrink-0 rounded-md px-1 font-mono text-xs tabular-nums text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1">
      [{formatStamp(start)}]
    </button>
  );

  return <section aria-label={t('d1Title')} className="w-full min-w-0 rounded-md border border-border-subtle p-2">
    <button type="button" aria-expanded={open} aria-controls="notes-d1-body" onClick={() => setOpen((v) => !v)}
      className="flex w-full min-w-0 items-center gap-1 rounded-md py-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1">
      {open ? <ChevronDown aria-hidden="true" className="size-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="size-4 shrink-0" />}
      <span className="truncate">{t('d1Title')} ({count})</span>
    </button>
    {open && <VStack id="notes-d1-body" spacing="sm" className="mt-2 w-full min-w-0">
      <Text size="xs" variant="muted">{modelCached ? t('d1ModelReady') : t('d1ModelMissing')}</Text>
      {!modelCached && <Button size="sm" variant="outline" onClick={download}>{t('d1Download')}</Button>}
      {intelligence.progress.total > 0 && <Text size="xs" variant="muted">
        {t('d1Progress').replace('{done}', String(intelligence.progress.done)).replace('{total}', String(intelligence.progress.total))}
      </Text>}
      {running && <Text size="xs" variant="muted" role="status">{t('d1Running')}</Text>}
      {intelligence.status === 'error' && <Text size="xs" role="alert">{t('d1Error')}{intelligence.error ? ` ${intelligence.error}` : ''}</Text>}
      <HStack spacing="sm" align="center" className="flex-wrap">
        <Button size="sm" variant="primary" disabled={recording || !modelCached || running} onClick={scan}>
          {hasResults ? t('d1Rescan') : t('d1Scan')}
        </Button>
        {recording && <Text size="xs" variant="muted">{t('d1Recording')}</Text>}
      </HStack>

      <D1List title={t('d1Decisions')} empty={t('d1Empty')} count={intelligence.decisions.length} t={t}>
        {intelligence.decisions.map((d) => (
          <li key={d.id} className="flex min-w-0 items-start gap-1">
            {jumpButton(d.start, d.segmentIds[0])}
            <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">{d.text}</Text>
            <Button iconOnly size="sm" variant="ghost" tooltip={t('d1Save')} aria-label={`${t('d1Save')}: ${d.text}`}
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => { addDecision(sessionId, d.text, d.segmentIds[0]); }} />
          </li>
        ))}
      </D1List>

      <D1List title={t('d1ActionItems')} empty={t('d1Empty')} count={intelligence.actionItems.length} t={t}>
        {intelligence.actionItems.map((a) => (
          <li key={a.id} className="flex min-w-0 items-start gap-1">
            {jumpButton(a.start, a.segmentIds[0])}
            <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">
              {a.text}{a.owner ? ` (${a.owner})` : ''}
            </Text>
            <Button iconOnly size="sm" variant="ghost" tooltip={t('d1Save')} aria-label={`${t('d1Save')}: ${a.text}`}
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => { addAction(sessionId, a.text, a.segmentIds[0] ? { sourceSegmentId: a.segmentIds[0] } : {}); }} />
          </li>
        ))}
      </D1List>

      <D1List title={t('d1Flagged')} empty={t('d1Empty')} count={flagged.length} t={t}>
        {flagged.map(({ key, word, seg }) => (
          <li key={key} className="flex min-w-0 items-center gap-1">
            {jumpButton(seg.start, seg.id)}
            <Text size="sm" className="min-w-0 flex-1 truncate" title={word}>{word}</Text>
            <Button size="sm" variant="ghost" aria-label={`${t('d1ReviewWord')}: ${word}`} onClick={() => dispatchFixWord(word)}>
              {t('d1ReviewWord')}
            </Button>
          </li>
        ))}
      </D1List>

      <D1List title={t('d1SpeakerHints')} empty={t('d1Empty')} count={hints.length} t={t}>
        {hints.map((seg) => (
          <li key={seg.id} className="flex min-w-0 items-start gap-1">
            {jumpButton(seg.start, seg.id)}
            <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">
              {speakerLabel.get(seg.speaker) ?? seg.speaker}: <span className="text-muted-foreground">{t('d1CheckSpeaker')}</span>
            </Text>
          </li>
        ))}
        {hints.length > 0 && <li><Text size="xs" variant="muted">{t('d1SpeakerNote')}</Text></li>}
      </D1List>
    </VStack>}
  </section>;
}

function D1List({ title, empty, count, t, children }: {
  title: string; empty: string; count: number; t: T; children: ReactNode;
}) {
  return <section aria-label={title} className="w-full min-w-0">
    <Heading level={4} size="xs" className="min-w-0 truncate">{title} ({count})</Heading>
    {count === 0
      ? <Text size="xs" variant="muted" className="mt-1">{empty}</Text>
      : <ul className="mt-1 flex w-full min-w-0 flex-col gap-2">{children}</ul>}
  </section>;
}

function NoteSection({ id, title, count, addLabel, placeholder, empty, onSave, t, children }: {
  id: string; title: string; count: number; addLabel: string; placeholder: string; empty: string;
  onSave: (text: string) => void; t: T; children: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const close = () => { setAdding(false); setDraft(''); };
  const save = () => {
    const value = draft.trim();
    if (value) onSave(value);
    close();
  };
  return <section aria-labelledby={`${id}-heading`} className="w-full min-w-0">
    <HStack spacing="sm" justify="between" className="w-full min-w-0">
      <Heading id={`${id}-heading`} level={3} size="sm" className="min-w-0 truncate">{title} ({count})</Heading>
      <Button size="sm" variant="ghost" aria-label={addLabel} className="shrink-0 whitespace-nowrap"
        leadingIcon={<Plus aria-hidden="true" className="size-3.5" />}
        onClick={() => setAdding(true)}>{t('add')}</Button>
    </HStack>
    {adding && <div className="mt-2 w-full min-w-0">
      <Input autoFocus aria-label={addLabel} placeholder={placeholder} value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); save(); }
          if (event.key === 'Escape') { event.preventDefault(); close(); }
        }} />
      <Text size="xs" variant="muted" className="mt-1">{t('addHint')}</Text>
    </div>}
    {count === 0
      ? <Text size="xs" variant="muted" className="mt-1">{empty}</Text>
      : <ul className="mt-1 flex w-full min-w-0 flex-col gap-2">{children}</ul>}
  </section>;
}

function RowMenu({ t, onEdit, onDelete, name }: { t: T; onEdit?: () => void; onDelete: () => void; name: string }) {
  return <DropdownMenu>
    <DropdownMenuTrigger>
      <Button iconOnly size="sm" variant="ghost" tooltip={t('more')} aria-label={`${t('more')}: ${name}`}
        leadingIcon={<MoreHorizontal aria-hidden="true" className="size-4" />} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {onEdit && <DropdownMenuItem icon={<Pencil aria-hidden="true" className="size-4" />} onClick={onEdit}>{t('edit')}</DropdownMenuItem>}
      <DropdownMenuItem variant="danger" icon={<Trash2 aria-hidden="true" className="size-4" />} onClick={onDelete}>{t('delete')}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function ActionRow({ item, speakers, t, sessionId }: {
  item: ActionItem; speakers: Speaker[]; t: T; sessionId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [dueOpen, setDueOpen] = useState(false);
  const ownerLabel = item.ownerName ?? speakers.find((speaker) => speaker.id === item.ownerSpeakerId)?.label;
  const startEdit = () => { setDraft(item.text); setEditing(true); };
  const save = () => {
    const value = draft.trim();
    if (value && value !== item.text) updateAction(sessionId, item.id, { text: value });
    setEditing(false);
  };
  return <li className="flex min-w-0 flex-col gap-1">
    <div className="flex min-w-0 items-start gap-1">
      <Checkbox aria-label={item.text} checked={item.done} className="mt-1 shrink-0"
        onChange={() => updateAction(sessionId, item.id, { done: !item.done })} />
      {editing
        ? <Input autoFocus aria-label={t('edit')} value={draft} className="min-w-0 flex-1"
          onChange={(event) => setDraft(event.target.value)} onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); save(); }
            if (event.key === 'Escape') { event.preventDefault(); setEditing(false); }
          }} />
        : <button type="button" onClick={startEdit} title={t('edit')}
          className={`min-w-0 flex-1 break-words rounded-md py-0.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-1 ${item.done ? 'line-through opacity-60' : ''}`}>
          {item.text}
        </button>}
      <RowMenu t={t} name={item.text} onEdit={startEdit} onDelete={() => removeAction(sessionId, item.id)} />
    </div>
    <div className="flex min-w-0 flex-wrap gap-1 pl-7">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button type="button" className={CHIP} aria-label={`${t('owner')}: ${ownerLabel ?? t('noOwner')}`}>
            <User aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{ownerLabel ?? t('owner')}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem icon={!item.ownerSpeakerId && !item.ownerName ? <Check aria-hidden="true" className="size-4" /> : <span className="size-4" />}
            onClick={() => updateAction(sessionId, item.id, { ownerSpeakerId: undefined, ownerName: undefined })}>{t('noOwner')}</DropdownMenuItem>
          {speakers.map((speaker) => (
            <DropdownMenuItem key={speaker.id}
              icon={item.ownerSpeakerId === speaker.id ? <Check aria-hidden="true" className="size-4" /> : <span className="size-4" />}
              onClick={() => updateAction(sessionId, item.id, { ownerSpeakerId: speaker.id, ownerName: speaker.label })}>{speaker.label}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover open={dueOpen} onOpenChange={setDueOpen} onClose={() => setDueOpen(false)} dismissOnOutsideClick
        placement="bottom" maxWidth={220} title={t('due')}
        content={<VStack spacing="sm" className="w-full">
          <Input autoFocus aria-label={t('due')} type="date" value={item.due ?? ''}
            onChange={(event) => updateAction(sessionId, item.id, { due: event.target.value || undefined })}
            className="w-full min-w-0" />
          {item.due && <Button size="sm" variant="ghost" className="whitespace-nowrap"
            onClick={() => { updateAction(sessionId, item.id, { due: undefined }); setDueOpen(false); }}>{t('clearDue')}</Button>}
        </VStack>}>
        <button type="button" className={CHIP} aria-label={`${t('due')}: ${item.due ?? t('noDue')}`}>
          <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{item.due ?? t('due')}</span>
        </button>
      </Popover>
    </div>
  </li>;
}

function DecisionRow({ item, sessionId, t }: { item: Decision; sessionId: string; t: T }) {
  return <li className="flex min-w-0 items-start gap-1">
    <Text size="sm" className="min-w-0 flex-1 break-words py-0.5">{item.text}</Text>
    <RowMenu t={t} name={item.text} onDelete={() => removeDecision(sessionId, item.id)} />
  </li>;
}
