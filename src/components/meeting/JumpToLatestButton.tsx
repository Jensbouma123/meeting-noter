'use client';

import { ArrowDown } from 'lucide-react';
import { Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

export function JumpToLatestButton({ onClick }: { onClick: () => void }) {
  const t = useT('transcript');
  return (
    <div className="pointer-events-auto absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 animate-banner-enter">
      <Button
        variant="secondary"
        size={{ base: 'md', md: 'sm' }}
        onClick={onClick}
        leadingIcon={<ArrowDown className="size-3.5 animate-bounce text-primary motion-reduce:animate-none" />}
        className="rounded-full shadow-elevation-2"
      >
        {t('jump')}
      </Button>
    </div>
  );
}
