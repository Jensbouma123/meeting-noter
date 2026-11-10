'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Heading, Modal, ScrollView, Tab, TabList, TabPanel, Tabs, VStack } from '@jensbouma123/acciva-ui';
import { SETTINGS_SECTIONS, type SettingsSectionId } from './sections';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  /** Section ids that should show a red attention dot in the sidebar (e.g. a failed download). */
  alertSections?: SettingsSectionId[];
  children: ReactNode;
}

function useIsSmUp(): boolean {
  const [isSmUp, setIsSmUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsSmUp(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isSmUp;
}

/**
 * Settings dialog: a vertical section list beside the content from sm up, a
 * horizontally scrolling tab strip above it on phones. Built on the shared
 * `Modal` (portal, focus trap, Escape, scroll lock) and `Tabs` (roving arrow keys).
 */
export function SettingsDialog({
  open,
  onClose,
  activeSection,
  onSectionChange,
  alertSections = [],
  children,
}: SettingsDialogProps) {
  const isSmUp = useIsSmUp();
  const activeMeta = SETTINGS_SECTIONS.find((s) => s.id === activeSection);

  const tabs = SETTINGS_SECTIONS.map((section) => {
    const Icon = section.icon;
    const hasAlert = alertSections.includes(section.id);
    return (
      <Tab key={section.id} value={section.id} className="touch-target-44 shrink-0 gap-2.5 sm:w-full sm:justify-start sm:px-3 sm:py-2 [&_svg]:!size-4 [&_svg]:shrink-0">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{section.label}</span>
        {hasAlert && (
          <Badge variant="danger" dot size="xxs" className="sm:ml-auto">
            <span className="sr-only">needs attention</span>
          </Badge>
        )}
      </Tab>
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      size="lg"
      className="w-full !max-w-[calc(100vw-2rem)] max-sm:p-4 sm:!max-w-[860px]"
    >
      <Tabs
        value={activeSection}
        onValueChange={(v) => onSectionChange(v as SettingsSectionId)}
        orientation={isSmUp ? 'vertical' : 'horizontal'}
        variant="pill"
        size="sm"
        className="flex h-[calc(100dvh-9rem)] w-full flex-col overflow-hidden sm:h-[min(520px,calc(100dvh-10rem))] sm:flex-row"
      >
        {isSmUp ? (
          <TabList
            aria-label="Settings sections"
            className="h-full w-52 shrink-0 gap-0.5 overflow-y-auto !rounded-none border-r border-border-subtle !bg-transparent py-0 pr-3"
          >
            {tabs}
          </TabList>
        ) : (
          <ScrollView
            orientation="horizontal"
            fadeEdges
            showArrows="auto"
            aria-label="Settings sections"
            className="shrink-0 border-b border-border-subtle"
          >
            <TabList aria-label="Settings sections" className="gap-0.5 !rounded-none !bg-transparent p-2">
              {tabs}
            </TabList>
          </ScrollView>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface p-4 sm:py-0 sm:pl-6 sm:pr-2">
          <TabPanel value={activeSection}>
            <VStack spacing="lg" className="w-full max-w-2xl">
              <Heading as="h3" level={3} size="md" weight="semibold">
                {activeMeta?.label}
              </Heading>
              {children}
            </VStack>
          </TabPanel>
        </div>
      </Tabs>
    </Modal>
  );
}
