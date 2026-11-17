import { useState } from 'react';
import { Checkbox, Input } from '@jensbouma123/acciva-ui';
import { removeAction, updateAction } from '@/lib/meeting/notes';
import { ActionDueChip } from './ActionDueChip';
import { ActionOwnerChip } from './ActionOwnerChip';
import { RowMenu } from './RowMenu';
import { SourceText } from './SourceText';
import type { ActionRowProps } from './NotesPanel.types';

export function ActionRow({ item, speakers, t, sessionId, flash }: ActionRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const startEdit = () => {
    setDraft(item.text);
    setEditing(true);
  };
  const save = () => {
    const value = draft.trim();
    if (value && value !== item.text) updateAction(sessionId, item.id, { text: value });
    setEditing(false);
  };
  return (
    <li ref={flash?.ref} className={`flex min-w-0 flex-col gap-1 ${flash?.className ?? ''}`}>
      <div className="flex min-w-0 items-start gap-1">
        <Checkbox
          aria-label={item.text}
          checked={item.done}
          className="mt-1 shrink-0"
          onChange={() => updateAction(sessionId, item.id, { done: !item.done })}
        />
        {editing ? (
          <Input
            autoFocus
            aria-label={t('edit')}
            value={draft}
            className="min-w-0 flex-1"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : item.sourceSegmentId ? (
          <SourceText t={t} text={item.text} segmentId={item.sourceSegmentId} done={item.done} />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title={t('edit')}
            className={`min-w-0 flex-1 break-words rounded-md py-0.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-1 ${item.done ? 'line-through opacity-60' : ''}`}
          >
            {item.text}
          </button>
        )}
        <RowMenu t={t} name={item.text} onEdit={startEdit} onDelete={() => removeAction(sessionId, item.id)} />
      </div>
      <div className="flex min-w-0 flex-wrap gap-1 pl-7">
        <ActionOwnerChip item={item} speakers={speakers} t={t} sessionId={sessionId} />
        <ActionDueChip item={item} t={t} sessionId={sessionId} />
      </div>
    </li>
  );
}
