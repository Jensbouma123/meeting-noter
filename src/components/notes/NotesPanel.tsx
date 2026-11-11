'use client';

import { useCallback, useSyncExternalStore, useState } from 'react';
import { Button, Card, HStack, Heading, Input, Select, Text, VStack } from '@jensbouma123/acciva-ui';
import { Check, Pencil, Trash2 } from 'lucide-react';
import {
  addAction, addDecision, getNotes, removeAction, removeDecision, subscribe,
  suggestFromSegments, updateAction,
  type ActionItem, type Decision,
} from '@/lib/meeting/notes';
import type { Segment, Speaker } from '@/lib/meeting/types';
import { useT } from '@/lib/i18n/useT';

interface NotesPanelProps {
  sessionId: string;
  speakers?: Speaker[];
  segments?: Segment[];
}

export function NotesPanel({ sessionId, speakers = [], segments = [] }: NotesPanelProps) {
  const t = useT('notes');
  const subscribeSession = useCallback((callback: () => void) => subscribe(sessionId, callback), [sessionId]);
  const getSessionNotes = useCallback(() => {
    const value = getNotes(sessionId);
    return JSON.stringify(value);
  }, [sessionId]);
  const notes = useSyncExternalStore(
    subscribeSession,
    getSessionNotes,
    () => '{"actions":[],"decisions":[]}',
  );
  const parsedNotes = JSON.parse(notes) as ReturnType<typeof getNotes>;
  const [actionDraft, setActionDraft] = useState('');
  const [decisionDraft, setDecisionDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const suggestions = suggestFromSegments(segments).filter((suggestion) =>
    !parsedNotes.actions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId)
      && !parsedNotes.decisions.some((item) => item.sourceSegmentId === suggestion.sourceSegmentId),
  );

  const addNewAction = () => {
    const value = actionDraft.trim();
    if (!value) return;
    addAction(sessionId, value);
    setActionDraft('');
  };
  const addNewDecision = () => {
    const value = decisionDraft.trim();
    if (!value) return;
    addDecision(sessionId, value);
    setDecisionDraft('');
  };

  return (
    <VStack spacing="md" className="w-full">
      <section aria-labelledby="notes-actions-heading" className="w-full">
        <Heading id="notes-actions-heading" level={3} size="sm">{t('actions')}</Heading>
        <VStack spacing="sm" className="mt-2 w-full">
          {parsedNotes.actions.map((item) => (
            <ActionRow key={item.id} item={item} speakers={speakers} editing={editingId === item.id}
              onEdit={() => setEditingId(item.id)} onStopEditing={() => setEditingId(null)} t={t} sessionId={sessionId} />
          ))}
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); addNewAction(); }}>
            <Input aria-label={t('addAction')} placeholder={t('actionPlaceholder')} value={actionDraft}
              onChange={(event) => setActionDraft(event.target.value)} />
            <Button type="submit" size="sm" disabled={!actionDraft.trim()}>{t('addAction')}</Button>
          </form>
        </VStack>
      </section>

      <section aria-labelledby="notes-decisions-heading" className="w-full">
        <Heading id="notes-decisions-heading" level={3} size="sm">{t('decisions')}</Heading>
        <VStack spacing="sm" className="mt-2 w-full">
          {parsedNotes.decisions.map((item) => <DecisionRow key={item.id} item={item} sessionId={sessionId} />)}
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); addNewDecision(); }}>
            <Input aria-label={t('addDecision')} placeholder={t('decisionPlaceholder')} value={decisionDraft}
              onChange={(event) => setDecisionDraft(event.target.value)} />
            <Button type="submit" size="sm" disabled={!decisionDraft.trim()}>{t('addDecision')}</Button>
          </form>
        </VStack>
      </section>

      {suggestions.length > 0 && <section aria-label={t('suggest')} className="w-full">
        <Heading level={3} size="sm">{t('suggest')}</Heading>
        <VStack spacing="sm" className="mt-2 w-full">
          {suggestions.map((suggestion) => <Card key={suggestion.sourceSegmentId} variant="bordered" padding="sm">
            <VStack spacing="sm" className="w-full">
              <Text size="sm">{suggestion.text}</Text>
              <HStack spacing="sm">
                <Button size="sm" onClick={() => suggestion.kind === 'action'
                  ? addAction(sessionId, suggestion.text, { sourceSegmentId: suggestion.sourceSegmentId })
                  : addDecision(sessionId, suggestion.text, suggestion.sourceSegmentId)}>{t('accept')}</Button>
                <Button size="sm" variant="ghost" onClick={() => addDecision(sessionId, suggestion.text, suggestion.sourceSegmentId)}>{t('dismiss')}</Button>
              </HStack>
            </VStack>
          </Card>)}
        </VStack>
      </section>}

      {parsedNotes.actions.length === 0 && parsedNotes.decisions.length === 0 && suggestions.length === 0 && (
        <Text size="sm" variant="muted">{t('empty')}</Text>
      )}
    </VStack>
  );
}

function ActionRow({ item, speakers, editing, onEdit, onStopEditing, t, sessionId }: {
  item: ActionItem; speakers: Speaker[]; editing: boolean; onEdit: () => void;
  onStopEditing: () => void; t: (key: string) => string; sessionId: string;
}) {
  const [draft, setDraft] = useState(item.text);
  const ownerOptions = [{ value: '', label: t('noOwner') }, ...speakers.map((speaker) => ({ value: speaker.id, label: speaker.label }))];
  const save = () => { updateAction(sessionId, item.id, { text: draft.trim() || item.text }); onStopEditing(); };
  return <Card variant="bordered" padding="sm">
    <VStack spacing="sm" className="w-full">
      <HStack spacing="sm" className="w-full">
        <Button iconOnly tooltip={item.done ? t('markOpen') : t('markDone')} variant="ghost" size="sm"
          aria-pressed={item.done} leadingIcon={<Check aria-hidden="true" className="size-4" />}
          onClick={() => updateAction(sessionId, item.id, { done: !item.done })} />
        {editing ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <Input autoFocus aria-label={t('edit')} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <Button size="sm" type="submit">{t('save')}</Button>
          <Button size="sm" variant="ghost" type="button" onClick={onStopEditing}>{t('cancel')}</Button>
        </form> : <Text size="sm" className={`min-w-0 flex-1 ${item.done ? 'line-through opacity-60' : ''}`}>{item.text}</Text>}
        {!editing && <Button iconOnly tooltip={t('edit')} variant="ghost" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={onEdit} />}
        <Button iconOnly tooltip={t('delete')} variant="ghost" size="sm" leadingIcon={<Trash2 aria-hidden="true" className="size-4" />} onClick={() => removeAction(sessionId, item.id)} />
      </HStack>
      <HStack spacing="sm" className="w-full">
        <Select aria-label={t('owner')} options={ownerOptions} value={item.ownerSpeakerId ?? ''}
          onChange={(value) => updateAction(sessionId, item.id, {
            ownerSpeakerId: value || undefined,
            ownerName: speakers.find((speaker) => speaker.id === value)?.label,
          })} />
        <label className="flex items-center gap-2 text-sm">
          <span>{t('due')}</span>
          <input aria-label={t('due')} type="date" value={item.due ?? ''}
            onChange={(event) => updateAction(sessionId, item.id, { due: event.target.value || undefined })}
            className="rounded-md border border-border bg-surface px-2 py-1" />
        </label>
      </HStack>
    </VStack>
  </Card>;
}

function DecisionRow({ item, sessionId }: { item: Decision; sessionId: string }) {
  const t = useT('notes');
  return <HStack spacing="sm" className="w-full">
    <Text size="sm" className="min-w-0 flex-1">{item.text}</Text>
    <Button iconOnly tooltip={t('delete')} variant="ghost" size="sm" leadingIcon={<Trash2 aria-hidden="true" className="size-4" />}
      onClick={() => removeDecision(sessionId, item.id)} />
  </HStack>;
}
