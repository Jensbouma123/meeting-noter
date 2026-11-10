'use client';

import { useEffect, useState } from 'react';
import { Alert, Radio, RadioGroup, Select, Text } from '@jensbouma123/acciva-ui';
import type { CaptureMode } from '@/lib/meeting';
import type { AppSettings } from '@/components/meeting/types';
import { meeting } from '@/components/meeting/store';
import { SettingsGroup, SettingsRow, SettingsStackedRow } from './SettingsRow';

export function AudioCaptureSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
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
    label: d.label || `Mic ${index + 1}`,
  }));
  if (micOptions.length === 0) {
    micOptions.push({ value: 'default', label: 'Default mic' });
  }

  return (
    <>
      <SettingsGroup>
        <SettingsStackedRow
          label="Audio source"
          description="What to record. You can also switch this in the recording bar."
        >
          <RadioGroup
            value={settings.mode}
            onChange={(mode) => onSettingsChange({ ...settings, mode: mode as CaptureMode })}
            orientation="vertical"
          >
            <Radio value="mic" label="Mic" description="Only your microphone" />
            <Radio
              value="system"
              label="Call"
              description="Only the call audio from a shared tab or screen"
            />
            <Radio value="both" label="Both" description="Your mic and the call audio" />
          </RadioGroup>
        </SettingsStackedRow>
      </SettingsGroup>

      <Alert variant="info" layout="inline" title="Recording call audio">
        When you record Call or Both, your browser asks you to share a tab or screen. Turn on
        &ldquo;Share tab audio&rdquo; (or &ldquo;Share system audio&rdquo;). If you skip that, only
        your mic is recorded.
      </Alert>

      <SettingsGroup>
        <SettingsRow
          label="Microphone"
          description="The mic to record from."
          htmlFor="setting-mic-device"
          control={
            <div className="flex flex-col gap-2">
              <Select
                id="setting-mic-device"
                options={micOptions}
                value={settings.micDeviceId}
                onChange={(micDeviceId) => onSettingsChange({ ...settings, micDeviceId })}
                placeholder="Choose a mic"
                aria-label="Microphone"
              />
              {needsPermission && (
                <Text size="xs" variant="muted">
                  Allow mic access once to see your device names.
                </Text>
              )}
            </div>
          }
        />
      </SettingsGroup>
    </>
  );
}
