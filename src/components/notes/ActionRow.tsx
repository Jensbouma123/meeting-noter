import { useState } from 'react';
import { Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Popover, VStack } from '@jensbouma123/acciva-ui';
import { CalendarDays, Check, User } from 'lucide-react';
import { removeAction, updateAction } from '@/lib/meeting/notes';
import { CHIP } from './constants';
import { RowMenu } from './RowMenu';
import type { ActionRowProps } from './NotesPanel.types';

export function ActionRow({ item, speakers, t, sessionId }: ActionRowProps) {
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
