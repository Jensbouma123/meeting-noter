import { useState } from 'react';
import { Button, HStack, Heading, Input, Text } from '@jensbouma123/acciva-ui';
import { Plus } from 'lucide-react';
import type { NoteSectionProps } from './NotesPanel.types';

export function NoteSection({ id, title, count, addLabel, placeholder, empty, onSave, t, children }: NoteSectionProps) {
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
