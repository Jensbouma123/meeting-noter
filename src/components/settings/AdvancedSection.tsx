'use client';

import { useState } from 'react';
import { Switch } from '@jensbouma123/acciva-ui';
import { CaptureDiagnostics } from '@/components/meeting/CaptureDiagnostics';
import { captureDebugEnabled, setCaptureDebug } from '@/components/meeting/captureDebugStorage';
import { useT } from '@/lib/i18n/useT';
import { SpeechModelSection } from './SpeechModelSection';
import { ShortcutsSection } from './ShortcutsSection';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function AdvancedSection() {
  const t = useT('settings');
  const [diagnostics, setDiagnostics] = useState(captureDebugEnabled);
  return (
    <>
      <SpeechModelSection />
      <SettingsGroup>
        <SettingsRow
          label={t('diagnosticsToggle')}
          description={t('diagnosticsToggleDescription')}
          control={<Switch checked={diagnostics} onCheckedChange={(enabled) => { setCaptureDebug(enabled); setDiagnostics(enabled); }} aria-label={t('diagnosticsToggle')} />}
        />
      </SettingsGroup>
      {diagnostics && <CaptureDiagnostics />}
      <ShortcutsSection />
    </>
  );
}
