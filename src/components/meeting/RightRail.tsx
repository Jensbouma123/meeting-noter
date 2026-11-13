'use client';

import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSpeakerStats } from '@/lib/meeting';
import { PanelRightClose } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { Button, Drawer, useToast, VStack } from '@jensbouma123/acciva-ui';
import { RailCollapsed } from './RailCollapsed';
import { RailTabPanel } from './RailTabPanel';
import { RailTabs } from './RailTabs';
import { persistRailOpen, readInitialRailOpen } from './railOpenState';
import { useHydrated } from './useHydrated';
import type { RailTab, RightRailProps } from './RightRail.types';

const notedSessions = new Set<string>();

export function RightRail({ sessionId, segments = [] }: RightRailProps) {
  const t = useT('rail');
  const ts = useT('settings');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<RailTab>('participants');
  const hydrated = useHydrated();
  const [initialOpen] = useState(readInitialRailOpen);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = hydrated ? (override ?? initialOpen) : true;

  const speakerStatRows = useSpeakerStats();

  const asideRef = useRef<HTMLElement>(null);

  const toggleOpen = () => {
    const next = !open;
    persistRailOpen(next);
    flushSync(() => setOverride(next));
    const label = next ? t('hideRail') : t('showRail');
    Array.from(asideRef.current?.querySelectorAll('button') ?? [])
      .find((b) => b.getAttribute('aria-label') === label)
      ?.focus();
  };

  const onAssigned = (added: number) => {
    if (added > 0 && !notedSessions.has(sessionId)) {
      notedSessions.add(sessionId);
      toast({ title: ts('vocab.nameNote') });
    }
  };

  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isLgUp = useMediaQuery('(min-width: 1024px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wasLgUp, setWasLgUp] = useState(isLgUp);
  if (wasLgUp !== isLgUp) {
    setWasLgUp(isLgUp);
    if (isLgUp) setDrawerOpen(false);
  }

  useEffect(() => {
    const openDrawer = () => setDrawerOpen(true);
    window.addEventListener('mn:open-speakers', openDrawer);
    return () => window.removeEventListener('mn:open-speakers', openDrawer);
  }, []);

  const panel = (className: string) => (
    <RailTabPanel
      sessionId={sessionId}
      activeTab={activeTab}
      rows={speakerStatRows}
      segments={segments}
      className={className}
      onAssigned={onAssigned}
    />
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
        {panel('min-h-0 flex-1 overflow-y-auto px-1 pt-1 pb-4')}
      </VStack>
    </Drawer>
  );

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
        {!open && <RailCollapsed speakerCount={speakerStatRows.length} onExpand={toggleOpen} />}
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
            {panel('min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4')}
          </div>
        )}
      </aside>
    </>
  );
}
