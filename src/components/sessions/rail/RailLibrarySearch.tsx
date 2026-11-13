import { useState } from 'react';
import { Button } from '@jensbouma123/acciva-ui';
import { Sparkles } from 'lucide-react';
import { LibrarySearch } from '@/components/search/LibrarySearch';
import type { LibrarySearchProps } from '@/components/search/LibrarySearch.types';
import { useT } from '@/lib/i18n/useT';

export function RailLibrarySearch(props: LibrarySearchProps) {
  const t = useT('search');
  const [open, setOpen] = useState(false);
  return (
    <div className="shrink-0 border-b border-border-subtle p-2">
      <Button
        size="sm"
        variant="ghost"
        leadingIcon={<Sparkles className="size-4" />}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('libraryToggle')}
      </Button>
      {open && (
        <div className="mt-2 max-h-72 overflow-y-auto">
          <LibrarySearch {...props} />
        </div>
      )}
    </div>
  );
}
