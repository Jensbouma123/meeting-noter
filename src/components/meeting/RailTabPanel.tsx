'use client';

import { VStack } from '@jensbouma123/acciva-ui';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { RailPeopleSection } from './RailPeopleSection';
import type { RailTabPanelProps } from './RightRail.types';

export function RailTabPanel({ sessionId, activeTab, rows, segments, className, onAssigned }: RailTabPanelProps) {
  return (
    <VStack
      spacing="sm"
      role="tabpanel"
      id={`rail-panel-${activeTab}`}
      aria-labelledby={`rail-tab-${activeTab}`}
      className={className}
    >
      {activeTab === 'participants' ? (
        <RailPeopleSection sessionId={sessionId} rows={rows} onAssigned={onAssigned} />
      ) : (
        <NotesPanel
          sessionId={sessionId}
          speakers={rows.map((row) => ({ id: row.id, label: row.label, colorIndex: row.colorIndex, source: row.source }))}
          segments={segments}
        />
      )}
    </VStack>
  );
}
