'use client';

import { useEffect, useState } from 'react';
import { Alert, Radio, RadioGroup, Select, Text } from '@jensbouma123/acciva-ui';
import type { CaptureMode } from '@/lib/meeting';
import type { AppSettings } from '@/components/meeting/types';
import { meeting } from '@/components/meeting/store';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup, SettingsRow, SettingsStackedRow } from './SettingsRow';

export function AudioCaptureSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const t = useT('settings');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    meeting
      .listMicDevices()
      .then((devs) => setDevices(devs))
      .catch(() => {
        // Fallback — the "Default mic" option below still works.
      });
  }, []);

  // One-time migration: "native" (automatic system-audio capture via a
  // native helper process) stopped being possible once the app dropped its
  // server component — every install with that saved from before now has a
  // setting that no longer means anything. Settle it to "browser" (the only
  // capture path left) so nothing downstream has to keep special-casing a
  // dead value.
  useEffect(() => {
    if (settings.systemVia === 'native') {
      onSettingsChange({ ...settings, systemVia: 'browser' });
    }
    // Only re-run if the stored value itself changes; onSettingsChange is a
    // fresh closure every render in the parent and would otherwise loop this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.systemVia]);

  // Browsers hide device names until mic permission has been granted once.
  const needsPermission = devices.length > 0 && devices.every((d) => !d.label);

  const micOptions = devices.map((d, index) => ({
    value: d.deviceId || `device-${index}`,
    label: d.label || `${t('mic')} ${index + 1}`,
  }));
  if (micOptions.length === 0) {
    micOptions.push({ value: 'default', label: t('defaultMic') });
  }

  return (
    <>
      <SettingsGroup>
        <SettingsStackedRow
          label={t('audioSource')}
          description={t('audioSourceDescription')}
        >
          <RadioGroup
            value={settings.mode}
            onChange={(mode) => onSettingsChange({ ...settings, mode: mode as CaptureMode })}
            orientation="vertical"
          >
            <Radio value="mic" label={t('mic')} description={t('micOnly')} />
            <Radio value="both" label={t('micAndCall')} description={t('micAndCallDescription')} />
          </RadioGroup>
        </SettingsStackedRow>
      </SettingsGroup>

      <Alert variant="info" layout="inline" title={t('recordingCallAudio')}>
        {t('recordingCallAudioHelp')}
      </Alert>

      <SettingsGroup>
        <SettingsRow
          label={t('microphone')}
          description={t('microphoneDescription')}
          htmlFor="setting-mic-device"
          control={
            <div className="flex flex-col gap-2">
              <Select
                id="setting-mic-device"
                options={micOptions}
                value={settings.micDeviceId}
                onChange={(micDeviceId) => onSettingsChange({ ...settings, micDeviceId })}
                placeholder={t('chooseMic')}
                aria-label={t('microphone')}
              />
              {needsPermission && (
                <Text size="xs" variant="muted">
                  {t('micPermission')}
                </Text>
              )}
            </div>
          }
        />
      </SettingsGroup>
    </>
  );
}
