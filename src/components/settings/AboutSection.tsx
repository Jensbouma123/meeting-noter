'use client';

import { Text, VStack } from '@jensbouma123/acciva-ui';
import pkg from '../../../package.json';
import { SettingsGroup, SettingsRow } from './SettingsRow';

const APP_VERSION = pkg.version;

export function AboutSection() {
  return (
    <SettingsGroup>
      <SettingsRow
        label="Meeting Noter"
        description="Private meeting transcripts with speaker labels."
        control={
          <Text size="sm" variant="muted" font="mono">
            v{APP_VERSION}
          </Text>
        }
      />
      <VStack spacing="xs" className="w-full p-4">
        <Text size="xs" variant="muted">
          Transcription and speaker labels run on your device. No audio or transcript ever leaves
          this browser.
        </Text>
      </VStack>
    </SettingsGroup>
  );
}
