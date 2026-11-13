'use client';

import { useState } from 'react';
import type { SettingsSheetProps } from './SettingsSheet.types';
import { useAnyModelFailed } from '@/components/models';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import {
  DEFAULT_SETTINGS_SECTION,
  loadLastSettingsSection,
  saveLastSettingsSection,
  type SettingsSectionId,
} from '@/components/settings/sections';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { AdvancedSection } from '@/components/settings/AdvancedSection';
import { VocabularySection } from '@/components/settings/VocabularySection';
import { StorageSection } from '@/components/settings/StorageSection';
import { AboutSection } from '@/components/settings/AboutSection';

export function SettingsSheet({
  open,
  onClose,
  settings,
  onSettingsChange,
  section,
}: SettingsSheetProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(DEFAULT_SETTINGS_SECTION);
  const [hydrated, setHydrated] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const modelFailed = useAnyModelFailed();

  if (!hydrated && typeof window !== 'undefined') {
    setHydrated(true);
    setActiveSection(loadLastSettingsSection());
  }

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && section) {
      setActiveSection(section === 'speech-model' ? 'advanced' : section);
    }
  }

  const selectSection = (next: SettingsSectionId) => {
    setActiveSection(next);
    saveLastSettingsSection(next);
  };

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      activeSection={activeSection}
      onSectionChange={selectSection}
      alertSections={modelFailed ? ['advanced'] : []}
    >
      {activeSection === 'general' && (
        <GeneralSection settings={settings} onSettingsChange={onSettingsChange} />
      )}
      {activeSection === 'vocabulary' && <VocabularySection />}
      {activeSection === 'advanced' && <AdvancedSection />}
      {activeSection === 'storage' && <StorageSection settings={settings} onSettingsChange={onSettingsChange} />}
      {activeSection === 'about' && <AboutSection />}
    </SettingsDialog>
  );
}
