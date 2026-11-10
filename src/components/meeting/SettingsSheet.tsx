'use client';

import { useState } from 'react';
import type { AppSettings } from './types';
import { useAnyModelFailed } from '@/components/models';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import {
  DEFAULT_SETTINGS_SECTION,
  loadLastSettingsSection,
  saveLastSettingsSection,
  type SettingsSectionId,
} from '@/components/settings/sections';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { AudioCaptureSection } from '@/components/settings/AudioCaptureSection';
import { TranscriptionSection } from '@/components/settings/TranscriptionSection';
import { SpeechModelSection } from '@/components/settings/SpeechModelSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { ShortcutsSection } from '@/components/settings/ShortcutsSection';
import { StorageSection } from '@/components/settings/StorageSection';
import { AboutSection } from '@/components/settings/AboutSection';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  /** Deep-link to a section on open (e.g. the TopBar model pill jumps to "speech-model").
   *  Leave unset to keep whatever section the user last had open. */
  section?: SettingsSectionId;
}

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

  // Hydrate the remembered section once on mount, in render (not an effect,
  // to avoid a cascading-render lint flag) — localStorage isn't available
  // during SSR so this can't run on the server anyway.
  if (!hydrated && typeof window !== 'undefined') {
    setHydrated(true);
    setActiveSection(loadLastSettingsSection());
  }

  // A caller-supplied `section` deep-links to a specific pane each time the
  // dialog opens; otherwise the remembered section from the last visit wins.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && section) {
      setActiveSection(section);
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
      alertSections={modelFailed ? ['speech-model'] : []}
    >
      {activeSection === 'general' && (
        <GeneralSection settings={settings} onSettingsChange={onSettingsChange} />
      )}
      {activeSection === 'audio' && (
        <AudioCaptureSection settings={settings} onSettingsChange={onSettingsChange} />
      )}
      {activeSection === 'transcription' && (
        <TranscriptionSection settings={settings} onSettingsChange={onSettingsChange} />
      )}
      {activeSection === 'speech-model' && <SpeechModelSection />}
      {activeSection === 'appearance' && <AppearanceSection />}
      {activeSection === 'shortcuts' && <ShortcutsSection />}
      {activeSection === 'storage' && <StorageSection />}
      {activeSection === 'about' && <AboutSection />}
    </SettingsDialog>
  );
}
