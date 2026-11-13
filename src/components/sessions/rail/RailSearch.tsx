import { Input } from '@jensbouma123/acciva-ui';
import { Search } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { RailSearchProps } from './types';

export function RailSearch({ query, onChange }: RailSearchProps) {
  const t = useT('sidebar');
  return (
    <div className="shrink-0 border-b border-border-subtle p-2">
      <Input
        type="search"
        size="sm"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('search')}
        aria-label={t('search')}
        leadingIcon={<Search className="size-4" />}
        clearable
        onClear={() => onChange('')}
      />
    </div>
  );
}
