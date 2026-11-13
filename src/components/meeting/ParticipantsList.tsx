'use client';

import { useState } from 'react';
import { Button, Checkbox, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { SEARCH_THRESHOLD } from './participantList.constants';
import { filterPeople, newPersonName } from './participantList';
import type { ParticipantsListProps } from './ParticipantsList.types';

export function ParticipantsList({ people, selected, onToggle, onCreate }: ParticipantsListProps) {
  const t = useT('participants');
  const [query, setQuery] = useState('');
  const searchable = people.length > SEARCH_THRESHOLD;
  const visible = searchable ? filterPeople(people, query) : people;
  const fresh = searchable ? newPersonName(people, query) : null;
  const picked = new Set(selected.map((n) => n.toLowerCase()));

  const create = (name: string) => {
    onCreate(name);
    setQuery('');
  };

  return (
    <VStack spacing="sm" className="w-full">
      {searchable && (
        <Input
          type="search"
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (fresh) create(fresh);
          }}
        />
      )}
      {people.length === 0 && <Text variant="muted">{t('noPeople')}</Text>}
      <ul className="m-0 flex max-h-72 w-full list-none flex-col gap-1 overflow-y-auto p-0" aria-label={t('peopleLabel')}>
        {fresh && (
          <li className="flex min-h-11 items-center justify-between gap-2">
            <span className="truncate">{fresh}</span>
            <Button variant="secondary" size="sm" onClick={() => create(fresh)}>
              {t('add')}
            </Button>
          </li>
        )}
        {visible.map((name) => (
          <li key={name} className="flex min-h-11 items-center gap-2">
            <Checkbox aria-label={name} checked={picked.has(name.toLowerCase())} onChange={() => onToggle(name)} />
            <span className="truncate">{name}</span>
          </li>
        ))}
      </ul>
    </VStack>
  );
}
